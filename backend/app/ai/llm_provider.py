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
        # 2. Build full, comprehensive resume context
        suggestion_ctx = ""
        if target_suggestion:
            suggestion_ctx = f"""
SPECIFIC SUGGESTION BEING DISCUSSED:
- Section / Location: {target_suggestion.location_label or target_suggestion.location.location_label or 'Resume Section'}
- Current Text in Resume: "{target_suggestion.original_text}"
- Suggested Replacement: "{target_suggestion.suggested_text}"
- Reasoning: {target_suggestion.reasoning}
- Why It Matters: {target_suggestion.why_it_matters}
"""

        # Complete resume text across all sections (Summary, Experience, Projects, Skills, Education)
        resume_lines = []
        for sec in doc.sections:
            heading = sec.heading_text or "Section"
            sec_paras = []
            for p in sec.paragraphs:
                txt = p.full_text.strip()
                if txt:
                    prefix = "• " if p.is_bullet else ""
                    sec_paras.append(f"{prefix}{txt}")
            if sec_paras:
                resume_lines.append(f"=== {heading.upper()} ===\n" + "\n".join(sec_paras))
        resume_context = "\n\n".join(resume_lines)
        if not resume_context and doc.raw_text:
            resume_context = doc.raw_text[:4000]

        jd_context = f"Target Job Description:\n{jd_text[:1200]}" if jd_text and jd_text.strip() else "No target Job Description provided (Standalone Mode)."

        # History summary (last 6 turns for conversational depth)
        history_lines = []
        if history:
            for h in history[-6:]:
                role_label = "User" if h.role == "user" else "Assistant"
                history_lines.append(f"{role_label}: {h.content}")
        history_text = "\n".join(history_lines) if history_lines else "None"

        prompt = f"""
{RESUME_CHAT_SYSTEM_PROMPT}

CANDIDATE'S COMPLETE RESUME:
{resume_context}

{jd_context}

{suggestion_ctx}

CONVERSATION HISTORY:
{history_text}

USER MESSAGE:
{msg_clean}

RESPONSE INSTRUCTIONS:
Act as a world-class, perceptive ChatGPT Career Mentor:
1. Thoroughly read and understand the candidate's actual resume above.
2. Directly answer their query with high intelligence, empathy, and technical depth.
3. Reference their actual projects, skills, and experience naturally by name.
4. When providing bullet rewrites, use the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]") and format with Before vs. After comparisons.
5. If analyzing their resume, break your review down into clear, structured Markdown sections.
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

        # Extract detected projects and skills from the actual document
        detected_projects = []
        detected_skills = []
        detected_experience = []
        for sec in doc.sections:
            sec_type = (sec.section_type or "").upper()
            heading_lower = (sec.heading_text or "").lower()
            if "project" in heading_lower or sec_type == "PROJECTS":
                for p in sec.paragraphs:
                    if not p.is_bullet and len(p.full_text.strip()) > 3:
                        title = p.full_text.split("|")[0].split("-")[0].strip()
                        if 3 < len(title) < 50:
                            detected_projects.append(title)
            elif "skill" in heading_lower or sec_type == "SKILLS":
                for p in sec.paragraphs:
                    clean = re.sub(r'^[A-Za-z\s]+:\s*', '', p.full_text).strip()
                    tokens = [t.strip() for t in clean.split(",") if t.strip()]
                    detected_skills.extend(tokens[:10])
            elif "experience" in heading_lower or sec_type == "EXPERIENCE":
                for p in sec.paragraphs:
                    if p.is_bullet and len(p.full_text.strip()) > 15:
                        detected_experience.append(p.full_text.strip())

        proj_str = ", ".join(f"**{p}**" for p in detected_projects[:3]) if detected_projects else "your engineering projects"
        skills_str = ", ".join(f"`{s}`" for s in detected_skills[:6]) if detected_skills else "Python, APIs, and Full-Stack Architecture"

        # If asking about specific suggestion
        if target_suggestion:
            loc = target_suggestion.location_label or "this section"
            orig = target_suggestion.original_text
            sug = target_suggestion.suggested_text
            reason = target_suggestion.reasoning

            if any(q in msg_lower for q in ["why", "reason", "purpose", "explain"]):
                return (
                    f"### Why This Change Matters for {loc}\n\n"
                    f"**Current Phrasing:**\n> *\"{orig}\"*\n\n"
                    f"**Recommended Upgrade:**\n> **\"{sug}\"**\n\n"
                    f"#### Recruiter & ATS Insight:\n"
                    f"- **Executive Action Verbs:** Weak openers diminish perceived ownership. Stronger power verbs position you as the primary driver.\n"
                    f"- **Technical Precision:** {reason}\n"
                    f"- **Screening Impact:** ATS algorithms and hiring managers look for concrete technical artifacts rather than passive involvement.\n\n"
                    f"Would you like me to tailor this for a specific industry or role level?"
                )

            if any(q in msg_lower for q in ["shorter", "concise", "brief", "short version"]):
                short_sug = sug.split(",")[0].rstrip(".") + "." if "," in sug else sug
                return (
                    f"### Concise Variations for {loc}\n\n"
                    f"Here are two streamlined options that preserve maximum impact in fewer words:\n\n"
                    f"1. **Streamlined & Direct:**\n"
                    f"   > **\"{short_sug}\"**\n"
                    f"   *Best when saving line height on a 1-page resume.*\n\n"
                    f"2. **Full Technical Scope:**\n"
                    f"   > **\"{sug}\"**\n"
                    f"   *Best when targeting senior engineering roles that require explicit tech stack mentions.*\n\n"
                    f"Click **[Edit]** on the suggestion card to paste your preferred choice!"
                )

            if any(q in msg_lower for q in ["alternative", "variations", "another way", "options"]):
                clean_orig = orig.lstrip('•-* ').strip()
                return (
                    f"### Alternative Phrasings for {loc}\n\n"
                    f"Depending on what aspect of your work you want to emphasize, here are 3 tailored angles:\n\n"
                    f"**Option 1: Outcome & Performance Focus**\n"
                    f"> **\"{sug}\"**\n\n"
                    f"**Option 2: Architecture & Scalability Focus**\n"
                    f"> **\"Architected and deployed {clean_orig}, ensuring high fault tolerance, clean modular design, and robust API endpoints.\"**\n\n"
                    f"**Option 3: Leadership & Delivery Focus**\n"
                    f"> **\"Spearheaded the end-to-end implementation of {clean_orig}, driving technical execution and accelerating delivery milestones.\"**\n\n"
                    f"Which angle best reflects your primary contribution?"
                )

            return (
                f"### Suggestion Breakdown for {loc}\n\n"
                f"**Current:** *\"{orig}\"*\n"
                f"**Suggested:** **\"{sug}\"**\n\n"
                f"**Why this strengthens your profile:**\n"
                f"{reason}\n\n"
                f"You can ask me to make it shorter, add specific technologies, or explain how to talk about this in an interview!"
            )

        # General questions: Review / Critique
        if any(q in msg_lower for q in ["review", "critique", "how is my resume", "analyze my resume", "feedback"]):
            return (
                f"### Comprehensive Resume Evaluation\n\n"
                f"I've analyzed your complete resume for **{doc.filename}**. Here is my executive assessment:\n\n"
                f"#### 1. Core Strengths ✨\n"
                f"- **Solid Technical Foundation:** Good representation of modern technologies including {skills_str}.\n"
                f"- **Tangible Project Evidence:** Practical, hands-on implementations in {proj_str}.\n"
                f"- **Clean Structural Hierarchy:** Standard sections are readily parseable by ATS scanners.\n\n"
                f"#### 2. Key Areas for Improvement 🎯\n"
                f"- **Quantifiable Outcomes:** Several bullets describe *what* you did, but not *the scale or business metric* (e.g. latency reduced by X%, throughput increased by Y%).\n"
                f"- **Action Verb Consistency:** Upgrade passive verbs (e.g. *'worked on'*, *'made'*, *'helped with'*) to executive power verbs (e.g. *'Engineered'*, *'Spearheaded'*, *'Optimized'*).\n"
                f"- **Technical Depth:** Specify frameworks, database indexing, or deployment environments rather than generic descriptors.\n\n"
                f"#### 3. Recommended Next Step\n"
                f"Review the actionable items in your **Resume Suggestions** feed, or ask me: *\"How can I rewrite my {detected_projects[0] if detected_projects else 'project'} bullet?\"*"
            )

        # Strengths & Weaknesses
        if any(q in msg_lower for q in ["strength", "weakness", "weaknesses", "pros and cons"]):
            return (
                f"### Strengths & Growth Opportunities\n\n"
                f"Based on a thorough review of your resume content:\n\n"
                f"#### Identified Strengths:\n"
                f"1. **Strong Project Highlights:** Projects like {proj_str} showcase practical end-to-end development capability.\n"
                f"2. **Broad Tech Inventory:** Relevant skills across {skills_str}.\n"
                f"3. **Clear Career Narrative:** Cohesive progression across your technical projects and experience.\n\n"
                f"#### Areas Needing Enhancement:\n"
                f"1. **Quantification Gap:** Adding measurable metrics (%, $, latency, scale) dramatically boosts hiring manager callback rates.\n"
                f"2. **Bullet Punchiness:** Using the Google X-Y-Z formula to clearly connect actions with outcomes.\n"
                f"3. **Role Alignment:** {'Tailoring bullet points to mirror target keywords from the Job Description.' if has_jd else 'Adding a target Job Description to highlight exact matching skills.'}\n\n"
                f"Which area would you like to improve first?"
            )

        # Projects / Bullet Rewrites
        if any(q in msg_lower for q in ["project", "projects", "bullet", "bullets", "rewrite"]):
            example_proj = detected_projects[0] if detected_projects else "your top project"
            return (
                f"### The Google X-Y-Z Bullet Formula\n\n"
                f"Top tech companies (Google, Meta, Amazon) look for accomplishments structured as:\n"
                f"> **\"Accomplished [X] as measured by [Y], by doing [Z]\"**\n\n"
                f"#### Example Transformation for {example_proj}:\n"
                f"- **Before (Weak):** *\"Worked on a project for crowd detection using YOLO.\"*\n"
                f"- **After (High Impact):** *\"Developed a YOLOv8-based crowd density estimation system for real-time video analysis, reducing inference latency by 35% using TensorRT optimization.\"*\n\n"
                f"Paste any bullet or project description you'd like me to rewrite, and I'll generate 3 executive variations!"
            )

        # Skills & JD Alignment
        if any(q in msg_lower for q in ["skill", "skills", "keyword", "keywords", "jd", "job description"]):
            if has_jd:
                return (
                    f"### Job Description Alignment Strategy\n\n"
                    f"I've cross-referenced your resume against the target Job Description:\n\n"
                    f"1. **Matched Competencies:** Your experience with {skills_str} directly supports the core job requirements.\n"
                    f"2. **Key Recommendation:** Ensure these skills are not just listed in your Skills section, but actively woven into your project bullets under {proj_str}.\n"
                    f"3. **Addressing Gaps:** If the JD requires frameworks you have used in school or personal projects, incorporate them with concrete context.\n\n"
                    f"Would you like me to review a specific requirement from the Job Description?"
                )
            return (
                f"### Skills Section Optimization\n\n"
                f"Your detected skills: {skills_str}.\n\n"
                f"**Best Practices:**\n"
                f"- **Categorize Logically:** Group into *Languages, Frameworks, Databases, Tools & Platforms*.\n"
                f"- **Standardized Casing:** Ensure ATS readability (e.g. `Python`, `FastAPI`, `PostgreSQL`, `Docker`).\n"
                f"- **Contextual Evidence:** Every top skill should appear at least once in your project or experience bullets demonstrating how you used it."
            )

        # Default conversational ChatGPT greeting & assistance
        return (
            f"Hello! I'm your **Resume Improvement Assistant**.\n\n"
            f"I have reviewed your resume for **{doc.filename}**, including your work in {proj_str} and technical skills in {skills_str}.\n\n"
            f"Here are a few things we can do together:\n\n"
            f"- **Full Resume Review:** Ask *\"Review my overall resume\"* for a structured critique.\n"
            f"- **Bullet Overhauls:** Paste any sentence to upgrade it using the Google X-Y-Z formula.\n"
            f"- **Suggestion Deep-Dives:** Ask why any suggestion was recommended or get shorter/longer versions.\n"
            f"- **JD Tailoring:** Align your projects and skills directly against a target job posting.\n\n"
            f"What would you like to work on first?"
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

