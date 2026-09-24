import os
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
)
from app.ai.provider_interface import AIProviderInterface
from app.ai.mock_provider import MockAIProvider
from app.ai.prompts import SYSTEM_PROMPT, STANDALONE_ATS_PROMPT, INTERVIEW_PLAN_PROMPT
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
