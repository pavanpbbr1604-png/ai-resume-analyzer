import pytest
from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.schemas.job_description import JobDescriptionRequest
from app.ai.llm_provider import LLMAIProvider
from app.ai.mock_provider import MockAIProvider
from app.services.ai_service import AIService

def create_sample_document():
    p1 = NormalizedParagraph(
        paragraph_id="p_summary",
        index=1,
        is_bullet=False,
        alignment="LEFT",
        full_text="Software Engineer with 4 years experience in Python, FastAPI, and PostgreSQL.",
        text_hash="hash_sum_1",
        runs=[],
    )
    p2 = NormalizedParagraph(
        paragraph_id="p_skills",
        index=2,
        is_bullet=False,
        alignment="LEFT",
        full_text="Skills: Python, React, FastAPI, SQL, Git",
        text_hash="hash_sk_1",
        runs=[],
    )
    p3 = NormalizedParagraph(
        paragraph_id="p_exp",
        index=3,
        is_bullet=True,
        alignment="LEFT",
        full_text="Worked on designing microservices and building backend REST APIs.",
        text_hash="hash_exp_1",
        runs=[],
    )
    return NormalizedDocument(
        document_id="doc_test_123",
        filename="test_resume.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_summary",
                heading_text="SUMMARY",
                section_type="SUMMARY",
                confidence=1.0,
                paragraphs=[p1],
            ),
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[p2],
            ),
            NormalizedSection(
                section_id="sec_exp",
                heading_text="EXPERIENCE",
                section_type="EXPERIENCE",
                confidence=1.0,
                paragraphs=[p3],
            ),
        ],
        raw_text="Software Engineer with 4 years experience in Python, FastAPI, and PostgreSQL. Skills: Python, React, FastAPI, SQL, Git. Worked on designing microservices and building backend REST APIs."
    )

def test_mock_provider_dynamic_ats_extraction():
    doc = create_sample_document()
    jd = JobDescriptionRequest(
        title="Senior Cloud Backend Engineer",
        company="TechCorp",
        text="Looking for a Python and FastAPI engineer with strong Docker, Kubernetes, AWS, and Redis experience.",
        required_skills=["Docker", "AWS"],
        preferred_skills=["Kubernetes", "Redis"]
    )

    provider = MockAIProvider()
    summary, suggestions = provider.analyze_resume_full(doc, jd)

    # Check matched skills contains Python and FastAPI
    assert "Python" in summary.matched_skills
    assert "FastAPI" in summary.matched_skills

    # Check missing keywords contains Docker, Kubernetes, AWS, Redis
    assert "Docker" in summary.missing_keywords
    assert "Kubernetes" in summary.missing_keywords
    assert "AWS" in summary.missing_keywords
    assert "Redis" in summary.missing_keywords

    # Check score is dynamic and within valid bounds
    assert 0.0 <= summary.overall_match_score <= 100.0
    assert 0.0 <= summary.skills_match_score <= 100.0
    assert len(summary.section_scores) >= 3
    assert len(suggestions) > 0

def test_llm_provider_json_parser():
    doc = create_sample_document()
    provider = LLMAIProvider()

    raw_json = {
        "overall_match_score": 77.5,
        "skills_match_score": 70.0,
        "experience_match_score": 82.0,
        "formatting_score": 90.0,
        "clarity_score": 85.0,
        "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
        "missing_keywords": ["Docker", "Kubernetes", "AWS"],
        "section_scores": [
            {"section_name": "Technical Skills", "score": 70.0, "details": "Lacks cloud deployment tools."},
            {"section_name": "Work Experience", "score": 82.0, "details": "Good API background."}
        ],
        "suggestions": [
            {
                "suggestion_id": "sug_01",
                "category": "SKILL_ALIGNMENT",
                "type": "MISSING_KEYWORD",
                "severity": "HIGH",
                "confidence": 0.95,
                "original_text": "Skills: Python, React, FastAPI, SQL, Git",
                "suggested_text": "Skills: Python, React, FastAPI, SQL, Git, Docker, AWS",
                "reasoning": "Explicitly required in job description.",
                "why_it_matters": "Higher ATS keyword match rate."
            }
        ]
    }

    summary, suggestions = provider._parse_json_to_result(raw_json, doc)

    assert summary.overall_match_score == 77.5
    assert summary.matched_skills == ["Python", "FastAPI", "PostgreSQL"]
    assert summary.missing_keywords == ["Docker", "Kubernetes", "AWS"]
    assert len(suggestions) == 1

    # Check that location was resolved to the real paragraph
    sug = suggestions[0]
    assert sug.location.paragraph_id == "p_skills"
    assert sug.location.paragraph_text_hash == "hash_sk_1"

def test_ai_service_full_flow():
    doc = create_sample_document()
    jd = JobDescriptionRequest(
        title="Full Stack Engineer",
        company="StartupX",
        text="Requires React, TypeScript, Python, and MongoDB.",
        required_skills=["MongoDB", "TypeScript"]
    )

    analysis_id = AIService.create_analysis(doc, jd)
    assert analysis_id.startswith("an_")

    analysis = AIService.get_analysis(analysis_id)
    assert analysis is not None
    assert analysis.status == "COMPLETED"
    assert analysis.summary is not None
    assert "MongoDB" in analysis.summary.missing_keywords
