import os
import re
import json
import logging
import httpx
from typing import List, Optional, Any, Tuple, Dict
from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.suggestion import (
    AISuggestionItem,
    SeverityLevel,
    SuggestionCategory,
    SuggestionType,
    SuggestionStatus,
)
from app.schemas.analysis import (
    AnalysisSummary,
    InterviewPreparationPlan,
    ResumeChatMessage,
    ResumeChatResponse,
)
from app.ai.provider_interface import AIProviderInterface
from app.ai.mock_provider import MockAIProvider
from app.ai.prompts import SYSTEM_PROMPT, STANDALONE_ATS_PROMPT, INTERVIEW_PLAN_PROMPT, RESUME_CHAT_SYSTEM_PROMPT
from app.document.location_mapper import LocationMappingEngine
from app.analysis.deterministic_analyzer import analyze_deterministic
from app.analysis.deterministic_scoring import run_deterministic_analysis
from app.analysis.job_parser import parse_job_description
from app.analysis.semantic_analyzer import analyze_semantic


logger = logging.getLogger(__name__)

VALID_CATEGORIES = {c.value for c in SuggestionCategory}
VALID_TYPES = {t.value for t in SuggestionType}
VALID_SEVERITIES = {s.value for s in SeverityLevel}

class LLMAIProvider(AIProviderInterface):
    """
    Production-ready AI Provider integrating Google Gemini & OpenAI APIs.
    All numerical scoring and breakdowns are owned 100% by the deterministic Python engine.
    LLM provides qualitative suggestion rewrites and explanations without ever overriding scores.
    """
    def __init__(self):
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.openai_api_key = os.getenv("OPENAI_API_KEY") or ""
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
        self.fallback_provider = MockAIProvider()

    def analyze_resume(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> List[AISuggestionItem]:
        _, suggestions = self.analyze_resume_full(doc, jd)
        return suggestions

    def analyze_resume_full(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> Tuple[AnalysisSummary, List[AISuggestionItem]]:
        has_jd = bool(jd.text and jd.text.strip())

        # 1. Base deterministic suggestions
        det_suggestions = analyze_deterministic(doc)
        llm_suggestions: List[AISuggestionItem] = []

        # 2. Attempt LLM generation for suggestions
        if self.gemini_api_key:
            try:
                llm_sugs = self._call_gemini_suggestions(doc, jd)
                if llm_sugs:
                    llm_suggestions = llm_sugs
            except Exception as e:
                logger.warning(f"Gemini suggestion generation failed, using deterministic fallbacks: {e}")
        elif self.openai_api_key:
            try:
                llm_sugs = self._call_openai_suggestions(doc, jd)
                if llm_sugs:
                    llm_suggestions = llm_sugs
            except Exception as e:
                logger.warning(f"OpenAI suggestion generation failed, using deterministic fallbacks: {e}")

        # If LLM didn't return suggestions, add semantic rule suggestions for targeted mode
        all_suggestions = list(det_suggestions)
        if llm_suggestions:
            # Avoid duplicate target texts
            existing_origs = {s.original_text.strip().lower() for s in det_suggestions}
            for s in llm_suggestions:
                if s.original_text.strip().lower() not in existing_origs:
                    all_suggestions.append(s)
        elif has_jd:
            parsed_jd = parse_job_description(jd)
            all_suggestions.extend(analyze_semantic(doc, parsed_jd))

        crit = sum(1 for s in all_suggestions if s.severity == SeverityLevel.CRITICAL)
        high = sum(1 for s in all_suggestions if s.severity == SeverityLevel.HIGH)
        med = sum(1 for s in all_suggestions if s.severity == SeverityLevel.MEDIUM)
        low = sum(1 for s in all_suggestions if s.severity == SeverityLevel.LOW)

        # 3. Deterministic Python engine owns ALL numerical scores and breakdowns
        summary = run_deterministic_analysis(
            doc=doc,
            jd=jd,
            total_suggestions=len(all_suggestions),
            crit_count=crit,
            high_count=high,
            med_count=med,
            low_count=low
        )

        return summary, all_suggestions

    def _build_prompt_payload(self, doc: NormalizedDocument, jd: JobDescriptionRequest) -> str:
        resume_text_lines = []
        for sec in doc.sections:
            if sec.heading_text:
                resume_text_lines.append(f"\n--- SECTION: {sec.heading_text} (ID: {sec.section_id}) ---")
            for p in sec.paragraphs:
                resume_text_lines.append(f"Paragraph (ID: {p.paragraph_id}, Hash: {p.text_hash}): {p.full_text}")

        resume_context = "\n".join(resume_text_lines)
        jd_context = (
            f"Target Job Title: {jd.title or 'N/A'}\n"
            f"Target Company: {jd.company or 'N/A'}\n"
            f"Job Description:\n{jd.text}"
        )

        prompt = f"""
{SYSTEM_PROMPT}

You are an expert Applicant Tracking System (ATS) Parser and Senior Technical Recruiter.
Analyze the candidate's resume strictly against the target job description to generate qualitative, actionable resume bullet rewrites and improvements.

CRITICAL RULE: Do NOT generate numerical scores. All numerical scores are computed by a deterministic engine.
Focus entirely on high-impact suggestions where `original_text` is an EXACT substring from the resume.

TARGET JOB DESCRIPTION:
{jd_context}

CANDIDATE RESUME CONTENT:
{resume_context}

Respond ONLY with a valid JSON object matching the exact format:
{{
  "suggestions": [
    {{
      "suggestion_id": "sug_01",
      "category": "SKILL_ALIGNMENT",
      "type": "MISSING_KEYWORD",
      "severity": "HIGH",
      "confidence": 0.95,
      "requires_user_confirmation": true,
      "original_text": "exact substring in candidate resume to update",
      "suggested_text": "replacement text containing missing requirements or stronger action verbs",
      "reasoning": "Clear explanation for why this edit aligns with the job description",
      "why_it_matters": "Direct impact on ATS search ranking and hiring manager evaluation",
      "user_prompt_question": "Optional clarifying question if metric is needed"
    }}
  ]
}}
"""
        return prompt

    def _call_gemini_suggestions(self, doc: NormalizedDocument, jd: JobDescriptionRequest) -> Optional[List[AISuggestionItem]]:
        prompt = self._build_prompt_payload(doc, jd)
        model_path = self.gemini_model if self.gemini_model.startswith("models/") else f"models/{self.gemini_model}"
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.2
            }
        }

        with httpx.Client(timeout=15.0) as client:
            url = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent?key={self.gemini_api_key}"
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                text = data["candidates"][0]["content"]["parts"][0]["text"]
                raw_json = json.loads(text)
                return self._parse_json_to_suggestions(raw_json, doc)
        return None

    def _call_openai_suggestions(self, doc: NormalizedDocument, jd: JobDescriptionRequest) -> Optional[List[AISuggestionItem]]:
        prompt = self._build_prompt_payload(doc, jd)
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

        with httpx.Client(timeout=35.0) as client:
            resp = client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                raw_json = json.loads(content)
                return self._parse_json_to_suggestions(raw_json, doc)
        return None

    def _parse_json_to_suggestions(self, raw_data: Any, doc: NormalizedDocument) -> List[AISuggestionItem]:
        if not isinstance(raw_data, dict):
            return []

        raw_suggestions = raw_data.get("suggestions", [])
        if isinstance(raw_suggestions, dict):
            raw_suggestions = list(raw_suggestions.values())
        elif not isinstance(raw_suggestions, list):
            return []

        suggestions: List[AISuggestionItem] = []
        s_idx = 1
        for item in raw_suggestions:
            if not isinstance(item, dict):
                continue
            try:
                orig_text = str(item.get("original_text", "")).strip()
                if not orig_text:
                    continue

                loc, loc_conf = LocationMappingEngine.find_location(doc, orig_text)

                category_str = str(item.get("category", "SKILL_ALIGNMENT")).upper()
                if category_str not in VALID_CATEGORIES:
                    category_str = "SKILL_ALIGNMENT"

                type_str = str(item.get("type", "MISSING_KEYWORD")).upper()
                if type_str not in VALID_TYPES:
                    type_str = "MISSING_KEYWORD"

                severity_str = str(item.get("severity", "MEDIUM")).upper()
                if severity_str not in VALID_SEVERITIES:
                    severity_str = "MEDIUM"

                sug = AISuggestionItem(
                    suggestion_id=item.get("suggestion_id") or f"sug_ai_{s_idx}",
                    category=SuggestionCategory(category_str),
                    type=SuggestionType(type_str),
                    severity=SeverityLevel(severity_str),
                    confidence=float(item.get("confidence", 0.9)),
                    requires_user_confirmation=bool(item.get("requires_user_confirmation", True)),
                    location=loc,
                    location_confidence=loc_conf,
                    location_label=loc.location_label or str(item.get("location_label", "Resume Content")),
                    original_text=orig_text,
                    suggested_text=str(item.get("suggested_text", orig_text)),
                    reasoning=str(item.get("reasoning", "Recommended for higher ATS alignment.")),
                    why_it_matters=str(item.get("why_it_matters", "Improves keyword relevance and recruiter scoring.")),
                    user_prompt_question=item.get("user_prompt_question"),
                    status=SuggestionStatus.PENDING,
                )
                suggestions.append(sug)
                s_idx += 1
            except Exception as ex:
                logger.debug(f"Skipping invalid suggestion item: {ex}")
                continue

        return suggestions

    def generate_interview_plan(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> InterviewPreparationPlan:
        """
        Generates a systematic, personalized interview preparation plan.
        Uses deterministic interview_engine as the authoritative source of truth for:
        - Detected skills & categorization
        - JD requirements & gap priorities (Critical, Important, Supporting)
        - Multi-phase learning roadmap
        - Verified official / educational resource URLs
        - Real project verification questions & interactive checklist
        """
        from app.analysis.interview_engine import generate_personalized_interview_plan
        plan_dict = generate_personalized_interview_plan(doc, jd)
        return InterviewPreparationPlan(**plan_dict)

    def chat_resume(
        self,
        doc: NormalizedDocument,
        message: str,
        target_suggestion: Optional[AISuggestionItem] = None,
        history: Optional[List[ResumeChatMessage]] = None,
        jd_text: Optional[str] = None,
    ) -> ResumeChatResponse:
        """
        Processes interactive chat specifically for resume and JD discussions.
        Strictly rejects out-of-scope queries (weather, food, jokes, homework, personal advice)
        without expensive LLM calls to optimize cost & token consumption.
        """
        msg_clean = message.strip()
        msg_lower = msg_clean.lower()

        # 1. Fast Guardrail: Reject out-of-scope non-resume queries
        out_of_scope_patterns = [
            r"\b(tell me a joke|joke|funny story)\b",
            r"\b(what should i (eat|cook|wear)|recipe|recipes|food recommendation)\b",
            r"\b(weather in|what('s| is) the weather|rain today|temperature in)\b",
            r"\b(who (is|was) the (president|prime minister|king)|who won the match|sports score|ipl|fifa)\b",
            r"\b(stock price|bitcoin price|crypto price|crypto market|invest in stocks)\b",
            r"\b(personal relationship|dating advice|break up|girlfriend|boyfriend)\b",
            r"\b(write (a|my) (college )?(essay|homework|physics assignment|math proof))\b",
            r"\b(write a poem about|write a song about)\b",
            r"\b(help me with python unrelated to my resume|write a binary search tree in c\+\+)\b",
        ]
        for pat in out_of_scope_patterns:
            if re.search(pat, msg_lower):
                return ResumeChatResponse(
                    status="success",
                    reply="I can help only with your resume and job-description analysis. Ask me something about your resume or the JD.",
                    suggestion_id=target_suggestion.suggestion_id if target_suggestion else None,
                    is_scope_rejection=True,
                )

        # 2. Build targeted compact context
        suggestion_ctx = ""
        if target_suggestion:
            suggestion_ctx = f"""
TARGET SUGGESTION UNDER DISCUSSION:
- Section / Location: {target_suggestion.location_label or target_suggestion.location.location_label or 'Resume Section'}
- Current Text in Resume: "{target_suggestion.original_text}"
- Suggested Replacement: "{target_suggestion.suggested_text}"
- Reasoning: {target_suggestion.reasoning}
- Why It Matters: {target_suggestion.why_it_matters}
"""

        # Condensed resume overview (avoid resending entire verbose AST)
        resume_lines = []
        for sec in doc.sections[:6]:
            heading = sec.heading_text or "Section"
            paras = [p.full_text for p in sec.paragraphs[:4] if p.full_text.strip()]
            if paras:
                resume_lines.append(f"[{heading}]\n" + "\n".join(f"• {p}" for p in paras))
        resume_context = "\n\n".join(resume_lines)[:1800]

        jd_context = f"Target Job Description:\n{jd_text[:1000]}" if jd_text and jd_text.strip() else "No target Job Description provided (Standalone Mode)."

        # History summary (last 4 turns)
        history_lines = []
        if history:
            for h in history[-4:]:
                role_label = "User" if h.role == "user" else "Assistant"
                history_lines.append(f"{role_label}: {h.content}")
        history_text = "\n".join(history_lines) if history_lines else "None"

        prompt = f"""
{RESUME_CHAT_SYSTEM_PROMPT}

CANDIDATE RESUME SUMMARY:
{resume_context}

{jd_context}

{suggestion_ctx}

RECENT CONVERSATION HISTORY:
{history_text}

USER MESSAGE:
{msg_clean}

Respond as the dedicated Resume Improvement Assistant.
- Give a concise, actionable, professional reply formatted in clean markdown.
- If the user asks why a change was recommended, explain the specific action verb, clarity, or ATS benefit.
- If the user asks for shorter/longer alternatives, provide 2-3 polished variations.
- If the user asks about JD alignment, specify which skills or projects should be highlighted without inventing falsehoods.
"""

        # 3. Call LLM (Gemini or OpenAI)
        if self.gemini_api_key:
            reply = self.call_gemini_raw(prompt)
            if reply and reply.strip():
                return ResumeChatResponse(
                    status="success",
                    reply=reply.strip(),
                    suggestion_id=target_suggestion.suggestion_id if target_suggestion else None,
                    is_scope_rejection=False,
                )

        if self.openai_api_key:
            reply = self.call_openai_raw(prompt)
            if reply and reply.strip():
                return ResumeChatResponse(
                    status="success",
                    reply=reply.strip(),
                    suggestion_id=target_suggestion.suggestion_id if target_suggestion else None,
                    is_scope_rejection=False,
                )

        # 4. Contextual Fallback Response (when offline / no API key configured)
        reply = self._build_contextual_fallback_reply(
            msg_clean=msg_clean,
            target_suggestion=target_suggestion,
            doc=doc,
            has_jd=bool(jd_text and jd_text.strip()),
        )

        return ResumeChatResponse(
            status="success",
            reply=reply,
            suggestion_id=target_suggestion.suggestion_id if target_suggestion else None,
            is_scope_rejection=False,
        )

    def _build_contextual_fallback_reply(
        self,
        msg_clean: str,
        target_suggestion: Optional[AISuggestionItem],
        doc: NormalizedDocument,
        has_jd: bool,
    ) -> str:
        msg_lower = msg_clean.lower()

        # If asking about specific suggestion
        if target_suggestion:
            loc = target_suggestion.location_label or "this section"
            orig = target_suggestion.original_text
            sug = target_suggestion.suggested_text
            reason = target_suggestion.reasoning

            if any(q in msg_lower for q in ["why", "reason", "purpose", "explain"]):
                return (
                    f"**Why this change was suggested for {loc}:**\n\n"
                    f"- **Current Phrasing:** *\"{orig}\"*\n"
                    f"- **Recommended Replacement:** **\"{sug}\"**\n\n"
                    f"**Reasoning:** {reason}\n\n"
                    f"Using active, direct verbs and technical clarity helps your resume stand out in both ATS keyword filtering and recruiter 6-second scans."
                )

            if any(q in msg_lower for q in ["shorter", "concise", "brief", "short version"]):
                short_sug = sug.split(",")[0].rstrip(".") + "." if "," in sug else sug
                return (
                    f"Here are 2 concise versions for **{loc}**:\n\n"
                    f"1. **\"{short_sug}\"** (Streamlined action-focused)\n"
                    f"2. **\"{sug}\"** (Full impact with technical details)\n\n"
                    f"You can click **[Edit]** or **[Apply]** on the card to update your resume."
                )

            if any(q in msg_lower for q in ["alternative", "variations", "another way", "options"]):
                return (
                    f"Here are alternative options for **{loc}**:\n\n"
                    f"1. **\"{sug}\"** (Recommended for ATS clarity)\n"
                    f"2. **\"Engineered and deployed {orig.lstrip('•-* ').strip()}, ensuring high performance and maintainability.\"**\n"
                    f"3. **\"Delivered {orig.lstrip('•-* ').strip()} following best engineering practices.\"**"
                )

            return (
                f"Regarding **{loc}** (*\"{orig}\"*):\n\n"
                f"I recommend: **\"{sug}\"**\n\n"
                f"**Impact:** {reason}\n\n"
                f"Would you like a shorter variation or additional technical details added?"
            )

        # General questions
        if any(q in msg_lower for q in ["skill", "skills", "keyword", "keywords", "jd"]):
            if has_jd:
                return (
                    "**JD Alignment Strategy:**\n\n"
                    "1. Ensure required technical skills from the Job Description are prominently listed in your **Technical Skills** section.\n"
                    "2. Contextualize where you applied each skill in your project or work experience bullet points.\n"
                    "3. Avoid keyword stuffing; only include technologies you have working familiarity with."
                )
            return (
                "**Skills Section Guidance:**\n\n"
                "Organize your skills logically by category (e.g., *Languages, Frameworks, Databases, Tools*). Use standard casing (e.g. `Python`, `FastAPI`, `PostgreSQL`) so ATS parsers index them correctly."
            )

        if any(q in msg_lower for q in ["project", "projects", "bullet", "bullets", "rewrite"]):
            return (
                "**Formula for High-Impact Project Bullets (Google X-Y-Z Formula):**\n\n"
                "• **Action Verb + Core Technology + Quantified Outcome**\n\n"
                "*Example:* *\"Developed a YOLOv8-based crowd detection system for real-time video analysis, reducing inference latency by 30%.\"*\n\n"
                "Tell me which project or sentence you'd like me to rewrite!"
            )

        return (
            "I'm your **Resume Improvement Assistant**. I can help you with:\n\n"
            "• Explaining why any suggestion was recommended\n"
            "• Generating shorter or alternate bullet variations\n"
            "• Tailoring your projects & skills to a target Job Description\n"
            "• Making sentences more action-oriented and ATS-friendly\n\n"
            "How can I help improve your resume right now?"
        )

    def call_openai_raw(self, prompt: str) -> Optional[str]:
        """Direct text helper for OpenAI generation."""
        if not self.openai_api_key:
            return None
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.openai_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": RESUME_CHAT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.3
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            logger.warning(f"OpenAI raw text call failed: {e}")
        return None

    def call_gemini_raw(self, prompt: str) -> Optional[str]:
        """Direct text helper for Gemini generation."""
        if not self.gemini_api_key:
            return None

        model_path = self.gemini_model if self.gemini_model.startswith("models/") else f"models/{self.gemini_model}"
        url = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent?key={self.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3}
        }
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    logger.warning(f"Gemini raw text call returned {resp.status_code}: {resp.text[:150]}")
        except Exception as e:
            logger.warning(f"Gemini raw text call failed: {e}")
        return None

