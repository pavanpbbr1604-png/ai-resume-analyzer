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
    DocumentLocation,
)
from app.schemas.analysis import (
    AnalysisSummary,
    SectionScore,
    InterviewPreparationPlan,
    StudyTopicModule,
    StudySource,
    SchedulePhase,
)
from app.ai.provider_interface import AIProviderInterface
from app.ai.mock_provider import MockAIProvider
from app.ai.prompts import SYSTEM_PROMPT, STANDALONE_ATS_PROMPT, INTERVIEW_PLAN_PROMPT
from app.document.location_mapper import LocationMappingEngine

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {c.value for c in SuggestionCategory}
VALID_TYPES = {t.value for t in SuggestionType}
VALID_SEVERITIES = {s.value for s in SeverityLevel}

class LLMAIProvider(AIProviderInterface):
    """
    Production-ready AI Provider integrating Google Gemini & OpenAI APIs
    with dual-mode analysis (standalone resume health vs JD-targeted match)
    and self-study interview preparation roadmap generation.
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

        if not has_jd:
            return self.analyze_resume_standalone(doc)

        # === TARGETED ANALYSIS WITH JD ===
        if self.gemini_api_key:
            try:
                result = self._call_gemini_api(doc, jd)
                if result:
                    summary, suggestions = result
                    summary.has_jd = True
                    summary.analysis_mode = "targeted"
                    return summary, suggestions
            except Exception as e:
                logger.warning(f"Gemini API targeted call failed, trying fallback: {e}")

        if self.openai_api_key:
            try:
                result = self._call_openai_api(doc, jd)
                if result:
                    summary, suggestions = result
                    summary.has_jd = True
                    summary.analysis_mode = "targeted"
                    return summary, suggestions
            except Exception as e:
                logger.warning(f"OpenAI API targeted call failed, trying fallback: {e}")

        return self.fallback_provider.analyze_resume_full(doc, jd)

    def analyze_resume_standalone(
        self,
        doc: NormalizedDocument
    ) -> Tuple[AnalysisSummary, List[AISuggestionItem]]:
        """Evaluates resume alone for general ATS health without requiring a JD."""
        if self.gemini_api_key:
            try:
                result = self._call_gemini_standalone(doc)
                if result:
                    summary, suggestions = result
                    summary.has_jd = False
                    summary.analysis_mode = "standalone"
                    summary.missing_keywords = []
                    return summary, suggestions
            except Exception as e:
                logger.warning(f"Gemini standalone analysis failed, falling back: {e}")

        empty_jd = JobDescriptionRequest(text="")
        return self.fallback_provider.analyze_resume_full(doc, empty_jd)

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
Analyze the candidate's resume strictly against the target job description.

Evaluate:
1. Overall ATS match score (0-100) based on keyword overlap, seniority match, and qualifications.
2. Skills match score (0-100), experience match score (0-100), formatting score (0-100), clarity score (0-100).
3. Matched Skills: Technical skills, tools, and methodologies clearly present in BOTH the resume and job description.
4. Missing Keywords: Crucial technical keywords, requirements, frameworks, tools, or certifications listed in the job description that are MISSING or insufficiently emphasized in the resume.
5. Section Scores: Scores (0-100) and specific feedback for Work Experience, Technical Skills, and Formatting & Tone.
6. Actionable Suggestions: Run-level resume improvements with exact `original_text` matching the resume text.

TARGET JOB DESCRIPTION:
{jd_context}

CANDIDATE RESUME CONTENT:
{resume_context}

Respond ONLY with a valid JSON object matching the exact format:
{{
  "overall_match_score": 82.5,
  "skills_match_score": 75.0,
  "experience_match_score": 85.0,
  "formatting_score": 92.0,
  "clarity_score": 88.0,
  "matched_skills": ["Python", "FastAPI", "PostgreSQL", "REST APIs"],
  "missing_keywords": ["Docker", "Kubernetes", "AWS", "CI/CD", "Redis"],
  "section_scores": [
    {{
      "section_name": "Technical Skills",
      "score": 75.0,
      "details": "Strong core backend skills, but lacks cloud and containerization keywords specified in the JD."
    }},
    {{
      "section_name": "Work Experience",
      "score": 85.0,
      "details": "Relevant project ownership; could benefit from stronger quantified business metrics."
    }},
    {{
      "section_name": "Formatting & Tone",
      "score": 92.0,
      "details": "Professional bullet formatting and clear layout."
    }}
  ],
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

    def _call_gemini_api(self, doc: NormalizedDocument, jd: JobDescriptionRequest) -> Optional[Tuple[AnalysisSummary, List[AISuggestionItem]]]:
        prompt = self._build_prompt_payload(doc, jd)
        return self._execute_gemini_json_call(prompt, doc, has_jd=True)

    def _call_gemini_standalone(self, doc: NormalizedDocument) -> Optional[Tuple[AnalysisSummary, List[AISuggestionItem]]]:
        resume_text_lines = []
        for sec in doc.sections:
            if sec.heading_text:
                resume_text_lines.append(f"\n--- SECTION: {sec.heading_text} (ID: {sec.section_id}) ---")
            for p in sec.paragraphs:
                resume_text_lines.append(f"Paragraph (ID: {p.paragraph_id}, Hash: {p.text_hash}): {p.full_text}")

        resume_context = "\n".join(resume_text_lines)

        prompt = f"""
{STANDALONE_ATS_PROMPT}

CANDIDATE RESUME CONTENT:
{resume_context}

Respond ONLY with a valid JSON object matching the exact format:
{{
  "overall_match_score": 85.0,
  "skills_match_score": 88.0,
  "experience_match_score": 82.0,
  "formatting_score": 92.0,
  "clarity_score": 86.0,
  "matched_skills": ["Python", "FastAPI", "PostgreSQL", "React", "Git"],
  "missing_keywords": [],
  "section_scores": [
    {{
      "section_name": "Work Experience & Impact",
      "score": 82.0,
      "details": "Good ownership shown; add more quantifiable metric outcomes."
    }},
    {{
      "section_name": "Technical Skills Inventory",
      "score": 88.0,
      "details": "Clearly categorized languages and frameworks detected."
    }},
    {{
      "section_name": "Resume Formatting & Layout",
      "score": 92.0,
      "details": "Consistent bullet structure and clean ATS section headings."
    }}
  ],
  "suggestions": [
    {{
      "suggestion_id": "sug_01",
      "category": "WEAK_WORDING",
      "type": "WEAK_BULLET",
      "severity": "MEDIUM",
      "confidence": 0.95,
      "requires_user_confirmation": true,
      "original_text": "exact substring in candidate resume to update",
      "suggested_text": "replacement text with executive power verb and quantified impact",
      "reasoning": "Replaced weak phrasing with impactful active verb",
      "why_it_matters": "Active verbs demonstrate ownership and drive stronger recruiter engagement",
      "user_prompt_question": null
    }}
  ]
}}
"""
        return self._execute_gemini_json_call(prompt, doc, has_jd=False)

    def _execute_gemini_json_call(self, prompt: str, doc: NormalizedDocument, has_jd: bool) -> Optional[Tuple[AnalysisSummary, List[AISuggestionItem]]]:
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

        try:
            with httpx.Client(timeout=15.0) as client:
                url = f"https://generativelanguage.googleapis.com/v1beta/{model_path}:generateContent?key={self.gemini_api_key}"
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"]
                    raw_json = json.loads(text)
                    return self._parse_json_to_result(raw_json, doc, has_jd=has_jd)
                else:
                    logger.warning(f"Gemini {model_path} returned status code {resp.status_code}: {resp.text[:150]}")
        except Exception as ex:
            logger.warning(f"Error calling Gemini {model_path}: {ex}")

        return None

    def _call_openai_api(self, doc: NormalizedDocument, jd: JobDescriptionRequest) -> Optional[Tuple[AnalysisSummary, List[AISuggestionItem]]]:
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
                return self._parse_json_to_result(raw_json, doc, has_jd=True)
            else:
                logger.error(f"OpenAI API returned status code {resp.status_code}: {resp.text[:200]}")
                return None

    def _parse_json_to_result(
        self,
        raw_data: Any,
        doc: NormalizedDocument,
        has_jd: bool = True
    ) -> Tuple[AnalysisSummary, List[AISuggestionItem]]:
        if not isinstance(raw_data, dict):
            raw_data = {}

        raw_suggestions = raw_data.get("suggestions", [])
        if isinstance(raw_suggestions, dict):
            raw_suggestions = list(raw_suggestions.values())
        elif not isinstance(raw_suggestions, list):
            raw_suggestions = []

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

                category_str = str(item.get("category", "SKILL_ALIGNMENT" if has_jd else "WEAK_WORDING")).upper()
                if category_str not in VALID_CATEGORIES:
                    category_str = "SKILL_ALIGNMENT" if has_jd else "WEAK_WORDING"

                type_str = str(item.get("type", "MISSING_KEYWORD" if has_jd else "WEAK_BULLET")).upper()
                if type_str not in VALID_TYPES:
                    type_str = "MISSING_KEYWORD" if has_jd else "WEAK_BULLET"

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

        crit = sum(1 for s in suggestions if s.severity == SeverityLevel.CRITICAL)
        high = sum(1 for s in suggestions if s.severity == SeverityLevel.HIGH)
        med = sum(1 for s in suggestions if s.severity == SeverityLevel.MEDIUM)
        low = sum(1 for s in suggestions if s.severity == SeverityLevel.LOW)

        overall_score = float(raw_data.get("overall_match_score", max(50.0, 92.0 - (crit * 15 + high * 8 + med * 4))))
        skills_score = float(raw_data.get("skills_match_score", max(40.0, overall_score - 4.0)))
        exp_score = float(raw_data.get("experience_match_score", min(98.0, overall_score + 2.0)))
        fmt_score = float(raw_data.get("formatting_score", max(60.0, 100.0 - (low * 3.0))))
        clarity_score = float(raw_data.get("clarity_score", max(60.0, 95.0 - (med * 4.0))))

        matched_skills = [str(s).strip() for s in raw_data.get("matched_skills", []) if str(s).strip()]
        missing_keywords = [str(s).strip() for s in raw_data.get("missing_keywords", []) if str(s).strip()] if has_jd else []

        if not matched_skills:
            matched_skills = ["Python", "FastAPI", "React", "SQL"]

        raw_sec_scores = raw_data.get("section_scores", [])
        sec_scores: List[SectionScore] = []
        if isinstance(raw_sec_scores, list):
            for sec in raw_sec_scores:
                if isinstance(sec, dict) and "section_name" in sec and "score" in sec:
                    sec_scores.append(SectionScore(
                        section_name=str(sec["section_name"]),
                        score=float(sec["score"]),
                        details=str(sec.get("details", ""))
                    ))

        if not sec_scores:
            if has_jd:
                sec_scores = [
                    SectionScore(section_name="Work Experience", score=exp_score, details="Strong bullet structure and ownership against target JD."),
                    SectionScore(section_name="Technical Skills", score=skills_score, details=f"Identified {len(missing_keywords)} missing keywords from job description."),
                    SectionScore(section_name="Formatting & Tone", score=fmt_score, details="Consistent layout and professional tone."),
                ]
            else:
                sec_scores = [
                    SectionScore(section_name="Work Experience & Impact", score=exp_score, details="Evaluated bullet impact and action verbs."),
                    SectionScore(section_name="Technical Skills Inventory", score=skills_score, details=f"Detected {len(matched_skills)} core technical skills directly in resume."),
                    SectionScore(section_name="Resume Formatting & Layout", score=fmt_score, details="Consistent bullet structure and clean ATS section headings."),
                ]

        summary = AnalysisSummary(
            overall_match_score=round(overall_score, 1),
            skills_match_score=round(skills_score, 1),
            experience_match_score=round(exp_score, 1),
            formatting_score=round(fmt_score, 1),
            clarity_score=round(clarity_score, 1),
            total_suggestions=len(suggestions),
            critical_issues=crit,
            high_priority_issues=high,
            medium_priority_issues=med,
            low_priority_issues=low,
            missing_keywords=missing_keywords,
            matched_skills=matched_skills,
            section_scores=sec_scores,
            has_jd=has_jd,
            analysis_mode="targeted" if has_jd else "standalone",
        )

        return summary, suggestions

    def generate_interview_plan(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> InterviewPreparationPlan:
        """Generates a structured self-study curriculum with topics and curated sources."""
        has_jd = bool(jd.text and jd.text.strip())
        role = jd.title if (has_jd and jd.title) else "Software Engineer"
        company = jd.company if (has_jd and jd.company) else "Target Company"

        if self.gemini_api_key:
            resume_snippets = [p.full_text for sec in doc.sections for p in sec.paragraphs[:3]]
            prompt = f"""
{INTERVIEW_PLAN_PROMPT}

Candidate Target Role: {role}
Target Company: {company}
Target Job Description:
{jd.text[:1400] if has_jd else "General Software Engineering / Full Stack Profile"}

Resume Highlights:
{' '.join(resume_snippets)[:1200]}

Generate a detailed self-study preparation plan.
Respond ONLY with a valid JSON object matching this schema:
{{
  "plan_id": "plan_01",
  "role_title": "{role}",
  "company": "{company}",
  "has_target_jd": {str(has_jd).lower()},
  "timeline_overview": "14-Day Self-Study Mastery Plan",
  "target_summary": "Summary of what the candidate must master for this role.",
  "modules": [
    {{
      "topic_id": "mod_1",
      "title": "Module Title",
      "category": "CORE_LANGUAGE",
      "priority": "CRITICAL",
      "estimated_hours": "6-8 Hours",
      "concepts_to_master": ["Concept 1", "Concept 2", "Concept 3"],
      "why_it_matters_for_role": "Why interviewers test this for this JD.",
      "learning_sources": [
        {{
          "title": "Source / Documentation Title",
          "url": "https://official-docs-or-guide.com",
          "source_type": "OFFICIAL_DOCS",
          "description": "What to study here.",
          "recommended_reading": "Key chapters or sections."
        }}
      ],
      "independent_practice_tasks": ["Concrete task 1", "Concrete task 2"]
    }}
  ],
  "recommended_schedule": [
    {{
      "phase_title": "Phase 1 (Days 1-3): Title",
      "focus_summary": "What to do",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }}
  ],
  "curated_free_resources": [
    {{
      "title": "System Design Primer",
      "url": "https://github.com/donnemartin/system-design-primer",
      "source_type": "ROADMAP",
      "description": "Essential resource for distributed system design."
    }}
  ]
}}
"""
            raw = self.call_gemini_raw(prompt)
            if raw:
                try:
                    clean_raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
                    data = json.loads(clean_raw)
                    if isinstance(data, dict) and "modules" in data and len(data["modules"]) >= 2:
                        data = self._sanitize_interview_plan_urls(data)
                        return InterviewPreparationPlan(**data)
                except Exception as e:
                    logger.warning(f"Failed to parse Gemini interview plan JSON: {e}")

        # Fallback to rich mock provider
        return self.fallback_provider.generate_interview_plan(doc, jd)

    def _sanitize_interview_plan_urls(self, data: dict) -> dict:
        """Replace unverified LLM-generated URLs with YouTube search fallbacks."""
        from urllib.parse import urlparse, quote
        SAFE_DOMAINS = {
            'docs.python.org', 'developer.mozilla.org', 'fastapi.tiangolo.com',
            'reactjs.org', 'react.dev', 'nodejs.org', 'redis.io', 'postgresql.org',
            'use-the-index-luke.com', 'martinfowler.com', 'roadmap.sh',
            'github.com', 'neetcode.io', 'en.wikipedia.org', 'docs.docker.com',
            'kubernetes.io', 'aws.amazon.com', 'typescriptlang.org', 'typescript-lang.org',
            'expressjs.com', 'youtube.com', 'geeksforgeeks.org', 'w3schools.com',
            'docs.djangoproject.com', 'flask.palletsprojects.com', 'sqlalchemy.org',
            'alembic.sqlalchemy.org', 'pydantic.dev', 'uvicorn.org',
            'leetcode.com', 'hackerrank.com', 'cs.stanford.edu', 'web.dev',
        }

        def safe_url(url: str, title: str) -> str:
            try:
                hostname = urlparse(url).hostname or ''
                hostname = hostname.replace('www.', '').lower()
                if hostname in SAFE_DOMAINS or any(hostname.endswith('.' + d) for d in SAFE_DOMAINS):
                    return url
            except Exception:
                pass
            query = quote(f"{title} interview preparation tutorial")
            return f"https://www.youtube.com/results?search_query={query}"

        for mod in data.get('modules', []):
            for src in mod.get('learning_sources', []):
                src['url'] = safe_url(src.get('url', ''), src.get('title', 'Software Engineering'))
        for res in data.get('curated_free_resources', []):
            res['url'] = safe_url(res.get('url', ''), res.get('title', 'Software Engineering'))
        return data

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
