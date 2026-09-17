import pytest
from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.schemas.job_description import JobDescriptionRequest
from app.services.ai_service import AIService

@pytest.fixture
def sample_doc():
    return NormalizedDocument(
        document_id="doc_test_standalone",
        filename="resume.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_exp",
                heading_text="EXPERIENCE",
                section_type="EXPERIENCE",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_1",
                        index=1,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="worked on backend APIs using Python and FastAPI for microservices architecture.",
                        text_hash="hash_1",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_2",
                        index=2,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Python, FastAPI, React, PostgreSQL, Docker, Git",
                        text_hash="hash_2",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="worked on backend APIs using Python and FastAPI. Python, FastAPI, React, PostgreSQL, Docker, Git"
    )

def test_standalone_resume_ats_scoring_without_jd(sample_doc):
    empty_jd = JobDescriptionRequest(text="")
    analysis_id = AIService.create_analysis(sample_doc, empty_jd)
    analysis = AIService.get_analysis(analysis_id)

    assert analysis is not None
    assert analysis.status == "COMPLETED"
    assert analysis.summary is not None
    assert analysis.summary.has_jd is False
    assert analysis.summary.analysis_mode == "standalone"
    assert analysis.summary.overall_match_score > 0
    # In standalone mode, there should be NO fake missing keywords
    assert analysis.summary.missing_keywords == []
    # Detected skills from resume should be present
    assert "Python" in analysis.summary.matched_skills or "FastAPI" in analysis.summary.matched_skills
    # Suggestions should be generated for weak wording ("worked on")
    assert len(analysis.suggestions) > 0

def test_targeted_resume_ats_scoring_with_jd(sample_doc):
    target_jd = JobDescriptionRequest(
        title="Senior Python Backend Developer",
        company="FinTech Corp",
        text="Requires Python, FastAPI, Kubernetes, AWS, and Redis microservices experience."
    )
    analysis_id = AIService.create_analysis(sample_doc, target_jd)
    analysis = AIService.get_analysis(analysis_id)

    assert analysis is not None
    assert analysis.summary is not None
    assert analysis.summary.has_jd is True
    assert analysis.summary.analysis_mode == "targeted"
    assert analysis.summary.overall_match_score > 0
    # Missing keywords from JD should be identified
    assert len(analysis.summary.missing_keywords) > 0

def test_self_study_interview_plan_generation(sample_doc):
    target_jd = JobDescriptionRequest(
        title="Backend Engineer",
        company="Stripe",
        text="Looking for a backend engineer experienced with Python, API design, high throughput systems, and PostgreSQL."
    )
    plan = AIService.generate_interview_plan(sample_doc, target_jd)

    assert plan is not None
    assert plan.role_title is not None
    assert len(plan.modules) >= 2
    assert len(plan.recommended_schedule) >= 2
    
    # Check that each module has learning sources with valid URLs
    for mod in plan.modules:
        assert len(mod.concepts_to_master) > 0
        assert len(mod.learning_sources) > 0
        for src in mod.learning_sources:
            assert src.title
            assert src.url.startswith("http")

def test_deterministic_mistake_and_line_improvements():
    from app.analysis.deterministic_analyzer import analyze_deterministic
    doc = NormalizedDocument(
        document_id="doc_test_mistakes",
        filename="resume.docx",
        mime_type="docx",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_exp",
                heading_text="EXPERIENCE",
                section_type="EXPERIENCE",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_1",
                        index=1,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="was responsible for managment of various projects and delivered teh feature",
                        text_hash="hash_m1",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="was responsible for managment of various projects and delivered teh feature"
    )
    sugs = analyze_deterministic(doc)
    sug_types = [s.type.value if hasattr(s.type, 'value') else str(s.type) for s in sugs]
    # Trailing punctuation error (missing period)
    assert "PUNCTUATION_ERROR" in sug_types
    # Passive / weak verb
    assert "WEAK_BULLET" in sug_types or "WEAK_SENTENCE" in sug_types
    # Spelling errors ('managment', 'teh')
    assert "SPELLING_ERROR" in sug_types
    # Vague filler word ('various projects')
    assert "UNCLEAR_CONTENT" in sug_types

