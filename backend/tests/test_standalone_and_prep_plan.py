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

def test_guardrail_scenario_a_resume_only():
    """Scenario A — Resume Only: Only detected resume skills (Python, SQL, Git), no invented skills."""
    doc = NormalizedDocument(
        document_id="doc_scenario_a",
        filename="resume_a.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_skills",
                        index=0,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Skills: Python, SQL, Git",
                        text_hash="hash_a",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="Skills: Python, SQL, Git"
    )
    empty_jd = JobDescriptionRequest(text="")
    plan = AIService.generate_interview_plan(doc, empty_jd)

    assert plan.has_target_jd is False
    assert plan.mode == "resume_only"
    # Detected skills match exactly
    assert set(plan.detected_resume_skills) == {"Python", "SQL", "Git"}
    # Must NOT claim user has AWS, Docker, React
    for skill in ["AWS", "Docker", "Kubernetes", "React"]:
        assert skill not in plan.detected_resume_skills

    # Modules must cover detected skills
    module_topics = [m.title for m in plan.modules]
    assert any("Python" in t for t in module_topics)
    assert any("SQL" in t for t in module_topics)
    assert any("Git" in t for t in module_topics)

    # Questions must be tailored to detected skills
    all_questions = [q.question for q in plan.likely_interview_questions]
    for q_text in all_questions:
        # No questions claiming candidate knows React/AWS when not in resume
        assert "React" not in q_text
        assert "Kubernetes" not in q_text

def test_guardrail_scenario_b_resume_plus_jd():
    """Scenario B — Resume + JD: Python & SQL matched, React & AWS missing required/critical."""
    doc = NormalizedDocument(
        document_id="doc_scenario_b",
        filename="resume_b.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_b",
                        index=0,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Technical Skills: Python, SQL",
                        text_hash="hash_b",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="Technical Skills: Python, SQL"
    )
    jd = JobDescriptionRequest(
        title="Full Stack Engineer",
        text="Required skills: Python, SQL, React, AWS. Nice to have: GraphQL."
    )
    plan = AIService.generate_interview_plan(doc, jd)

    assert plan.has_target_jd is True
    assert plan.mode == "resume_jd"

    # Find skill gaps
    gaps_by_skill = {g.skill: g for g in plan.skill_gaps}
    assert "React" in gaps_by_skill
    assert "AWS" in gaps_by_skill
    assert gaps_by_skill["React"].priority == "CRITICAL"
    assert gaps_by_skill["AWS"].priority == "CRITICAL"
    assert gaps_by_skill["React"].status == "REQUIRED_MISSING"

    # Matched skills
    assert "Python" in gaps_by_skill
    assert "SQL" in gaps_by_skill
    assert gaps_by_skill["Python"].status == "REVISION_NEEDED" or gaps_by_skill["Python"].status == "MATCHED"

    # Roadmap must prioritize React & AWS (Critical) before optional topics
    critical_modules = [m for m in plan.modules if m.priority == "CRITICAL"]
    supporting_modules = [m for m in plan.modules if m.priority in ("SUPPORTING", "OPTIONAL")]
    if critical_modules and supporting_modules:
        crit_indices = [plan.modules.index(m) for m in critical_modules]
        supp_indices = [plan.modules.index(m) for m in supporting_modules]
        assert min(crit_indices) < min(supp_indices)

def test_guardrail_scenario_c_ats_unaffected_by_different_jd():
    """Scenario C — Different JD: ATS score unaffected across different JDs, but interview prep updates."""
    doc = NormalizedDocument(
        document_id="doc_scenario_c",
        filename="resume_c.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_c",
                        index=0,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Skills: Python, SQL",
                        text_hash="hash_c",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="Skills: Python, SQL"
    )
    jd_a = JobDescriptionRequest(
        title="Full Stack Engineer",
        text="Required skills: Python, SQL, React, AWS."
    )
    jd_b = JobDescriptionRequest(
        title="Java Developer",
        text="Required skills: Java, Spring Boot, Docker."
    )

    analysis_a = AIService.get_analysis(AIService.create_analysis(doc, jd_a))
    analysis_b = AIService.get_analysis(AIService.create_analysis(doc, jd_b))

    # ATS score must be 100% identical
    assert analysis_a.summary.ats_score == analysis_b.summary.ats_score
    assert analysis_a.summary.ats_breakdown.parseability == analysis_b.summary.ats_breakdown.parseability

    # Interview prep plan reflects JD B
    plan_b = AIService.generate_interview_plan(doc, jd_b)
    gaps_b = {g.skill: g for g in plan_b.skill_gaps}
    assert "Java" in gaps_b
    assert "Spring Boot" in gaps_b
    assert "Docker" in gaps_b

def test_guardrail_scenario_d_zero_variance_determinism():
    """Scenario D — Same Input: Repeated runs yield 100% identical outputs."""
    doc = NormalizedDocument(
        document_id="doc_scenario_d",
        filename="resume_d.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_skills",
                heading_text="SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_d",
                        index=0,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Skills: Python, SQL, Docker, FastAPI",
                        text_hash="hash_d",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="Skills: Python, SQL, Docker, FastAPI"
    )
    jd = JobDescriptionRequest(
        title="Backend Engineer",
        text="Required: Python, FastAPI, PostgreSQL, Kubernetes"
    )

    baseline_plan = AIService.generate_interview_plan(doc, jd)

    for _ in range(10):
        run_plan = AIService.generate_interview_plan(doc, jd)
        assert run_plan.detected_resume_skills == baseline_plan.detected_resume_skills
        assert len(run_plan.modules) == len(baseline_plan.modules)
        for i in range(len(baseline_plan.modules)):
            assert run_plan.modules[i].title == baseline_plan.modules[i].title
            assert run_plan.modules[i].priority == baseline_plan.modules[i].priority
            assert len(run_plan.modules[i].learning_sources) == len(baseline_plan.modules[i].learning_sources)
            for s_idx in range(len(baseline_plan.modules[i].learning_sources)):
                assert run_plan.modules[i].learning_sources[s_idx].url == baseline_plan.modules[i].learning_sources[s_idx].url


