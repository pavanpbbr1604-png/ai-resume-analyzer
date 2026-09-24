import pytest
from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.schemas.job_description import JobDescriptionRequest
from app.analysis.deterministic_scoring import (
    calculate_ats_score,
    calculate_jd_match_score,
    compute_analysis_hash,
    run_deterministic_analysis,
    ATS_ALGORITHM_VERSION,
    SEMANTIC_MODEL,
)
from app.analysis.skills_taxonomy import extract_canonical_skills

@pytest.fixture
def sample_resume():
    return NormalizedDocument(
        document_id="doc_sample_test",
        filename="john_doe_resume.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_contact",
                heading_text="HEADER & CONTACT",
                section_type="HEADER",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_0",
                        index=0,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="John Doe | john.doe@example.com | (555) 123-4567 | San Francisco, CA | linkedin.com/in/johndoe",
                        text_hash="hash_0",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_summary",
                heading_text="PROFESSIONAL SUMMARY",
                section_type="SUMMARY",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_1",
                        index=1,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Senior Software Engineer with 4+ years of experience designing scalable microservices, backend APIs, and distributed data systems.",
                        text_hash="hash_1",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_exp",
                heading_text="WORK EXPERIENCE",
                section_type="EXPERIENCE",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_2",
                        index=2,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="Architected high-throughput REST APIs using Python and FastAPI, reducing response latency by 35%.",
                        text_hash="hash_2",
                        runs=[]
                    ),
                    NormalizedParagraph(
                        paragraph_id="p_3",
                        index=3,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="Engineered resilient database schemas with PostgreSQL and Redis caching, scaling throughput to 10,000+ RPS.",
                        text_hash="hash_3",
                        runs=[]
                    ),
                    NormalizedParagraph(
                        paragraph_id="p_4",
                        index=4,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="Deployed containerized microservices to AWS utilizing Docker and CI/CD automated pipelines.",
                        text_hash="hash_4",
                        runs=[]
                    ),
                ]
            ),
            NormalizedSection(
                section_id="sec_skills",
                heading_text="TECHNICAL SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_5",
                        index=5,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Python, FastAPI, PostgreSQL, Docker, AWS, Redis, REST API, Git, CI/CD, React",
                        text_hash="hash_5",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_edu",
                heading_text="EDUCATION",
                section_type="EDUCATION",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_6",
                        index=6,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Bachelor of Science in Computer Science | University of California, Berkeley | 2018 - 2022",
                        text_hash="hash_6",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_proj",
                heading_text="PROJECTS",
                section_type="PROJECTS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_7",
                        index=7,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="Scalable Distributed Task Queue: Implemented asynchronous worker system processing 500k daily events.",
                        text_hash="hash_7",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text=(
            "John Doe | john.doe@example.com | (555) 123-4567 | San Francisco, CA | linkedin.com/in/johndoe\n"
            "PROFESSIONAL SUMMARY\n"
            "Senior Software Engineer with 4+ years of experience designing scalable microservices, backend APIs, and distributed data systems.\n"
            "WORK EXPERIENCE\n"
            "Architected high-throughput REST APIs using Python and FastAPI, reducing response latency by 35%.\n"
            "Engineered resilient database schemas with PostgreSQL and Redis caching, scaling throughput to 10,000+ RPS.\n"
            "Deployed containerized microservices to AWS utilizing Docker and CI/CD automated pipelines.\n"
            "TECHNICAL SKILLS\n"
            "Python, FastAPI, PostgreSQL, Docker, AWS, Redis, REST API, Git, CI/CD, React\n"
            "EDUCATION\n"
            "Bachelor of Science in Computer Science | University of California, Berkeley | 2018 - 2022\n"
            "PROJECTS\n"
            "Scalable Distributed Task Queue: Implemented asynchronous worker system processing 500k daily events."
        )
    )

def test_determinism_same_input_same_output(sample_resume):
    """Test 1: Same resume + same JD must yield 100% identical ATS and JD scores across repeated runs."""
    jd = JobDescriptionRequest(
        title="Senior Backend Engineer",
        company="Stripe",
        text=(
            "Required Qualifications:\n"
            "- 3+ years experience with Python and FastAPI\n"
            "- Strong PostgreSQL and Redis caching expertise\n"
            "- Docker and AWS cloud deployment experience\n\n"
            "Preferred Qualifications:\n"
            "- Kubernetes\n"
            "- GraphQL\n"
        )
    )

    baseline_summary = run_deterministic_analysis(sample_resume, jd)
    ats_first = baseline_summary.ats_score
    jd_first = baseline_summary.jd_match_score
    hash_first = baseline_summary.analysis_hash

    # Run 50 iterations to prove complete determinism (0 variance)
    for _ in range(50):
        res = run_deterministic_analysis(sample_resume, jd)
        assert res.ats_score == ats_first
        assert res.jd_match_score == jd_first
        assert res.analysis_hash == hash_first
        assert res.ats_breakdown.parseability == baseline_summary.ats_breakdown.parseability
        assert res.ats_breakdown.standard_sections == baseline_summary.ats_breakdown.standard_sections
        assert res.jd_match_breakdown.required_skills == baseline_summary.jd_match_breakdown.required_skills
        assert res.jd_match_breakdown.technical_keywords == baseline_summary.jd_match_breakdown.technical_keywords

def test_ats_independence_from_jd(sample_resume):
    """Test 2: ATS score MUST NOT change when different JDs are provided."""
    jd_python = JobDescriptionRequest(
        title="Python Developer",
        text="Looking for Python, FastAPI, Docker, and PostgreSQL developer."
    )
    jd_nurse = JobDescriptionRequest(
        title="Registered Nurse",
        text="Looking for emergency care, ICU, patient triage, clinical charting, and CPR certification."
    )
    empty_jd = JobDescriptionRequest(text="")

    summary_python = run_deterministic_analysis(sample_resume, jd_python)
    summary_nurse = run_deterministic_analysis(sample_resume, jd_nurse)
    summary_standalone = run_deterministic_analysis(sample_resume, empty_jd)

    # ATS scores and ATS breakdowns must be strictly identical regardless of JD
    assert summary_python.ats_score == summary_nurse.ats_score == summary_standalone.ats_score
    assert summary_python.ats_breakdown.parseability == summary_nurse.ats_breakdown.parseability
    assert summary_python.ats_breakdown.standard_sections == summary_nurse.ats_breakdown.standard_sections
    assert summary_python.ats_breakdown.contact_info == summary_nurse.ats_breakdown.contact_info
    assert summary_python.ats_breakdown.skills_inventory == summary_nurse.ats_breakdown.skills_inventory
    assert summary_python.ats_breakdown.experience_projects == summary_nurse.ats_breakdown.experience_projects
    assert summary_python.ats_breakdown.formatting_safety == summary_nurse.ats_breakdown.formatting_safety
    assert summary_python.ats_breakdown.content_optimization == summary_nurse.ats_breakdown.content_optimization

def test_jd_sensitivity(sample_resume):
    """Test 3: Different JDs must change the JD match score appropriately."""
    jd_matched = JobDescriptionRequest(
        title="Python Backend Engineer",
        text="Requirements: Python, FastAPI, PostgreSQL, Docker, AWS, REST API."
    )
    jd_unmatched = JobDescriptionRequest(
        title="Embedded Rust Developer",
        text="Requirements: Rust, Embedded C, RTOS, ARM Microcontrollers, FPGA, Zig."
    )

    summary_matched = run_deterministic_analysis(sample_resume, jd_matched)
    summary_unmatched = run_deterministic_analysis(sample_resume, jd_unmatched)

    assert summary_matched.jd_match_score is not None
    assert summary_unmatched.jd_match_score is not None
    assert summary_matched.jd_match_score > summary_unmatched.jd_match_score
    assert len(summary_matched.matched_skills) > len(summary_unmatched.matched_skills)

def test_alias_skill_matching():
    """Test 4: Aliases must normalize to canonical names."""
    text = "Experience with JS, ts, postgres, k8s, restful api, and ml algorithms."
    skills = extract_canonical_skills(text)

    assert "JavaScript" in skills
    assert "TypeScript" in skills
    assert "PostgreSQL" in skills
    assert "Kubernetes" in skills
    assert "REST API" in skills
    assert "Machine Learning" in skills

def test_false_positive_skill_prevention():
    """Test 5: Strict boundary protection must prevent false positive skill matching."""
    # 1. Java vs JavaScript
    java_only = "Experienced with Java Spring Boot backend services."
    skills_java = extract_canonical_skills(java_only)
    assert "Java" in skills_java
    assert "JavaScript" not in skills_java

    js_only = "Experienced with JavaScript and React web apps."
    skills_js = extract_canonical_skills(js_only)
    assert "JavaScript" in skills_js
    assert "Java" not in skills_js

    # 2. C vs C++ vs C#
    c_text = "Proficient in C programming and memory allocation."
    skills_c = extract_canonical_skills(c_text)
    assert "C" in skills_c
    assert "C++" not in skills_c
    assert "C#" not in skills_c

    cpp_text = "Experienced in C++ 17 and templates."
    skills_cpp = extract_canonical_skills(cpp_text)
    assert "C++" in skills_cpp
    assert "C#" not in skills_cpp

    csharp_text = "Built services with C# and .NET core."
    skills_csharp = extract_canonical_skills(csharp_text)
    assert "C#" in skills_csharp
    assert "C++" not in skills_csharp

    # 3. React vs React Native
    react_text = "Built web apps with React.js and Redux."
    skills_react = extract_canonical_skills(react_text)
    assert "React" in skills_react
    assert "React Native" not in skills_react

    # 4. AWS vs AWS Lambda
    aws_text = "Deployed infrastructure to AWS EC2 and S3."
    skills_aws = extract_canonical_skills(aws_text)
    assert "AWS" in skills_aws
    assert "AWS Lambda" not in skills_aws

def test_standalone_no_jd_mode(sample_resume):
    """Test 6: Standalone mode returns jd_match_score = None and empty missing_required_skills."""
    empty_jd = JobDescriptionRequest(text="")
    summary = run_deterministic_analysis(sample_resume, empty_jd)

    assert summary.has_jd is False
    assert summary.analysis_mode == "standalone"
    assert summary.ats_score > 0
    assert summary.jd_match_score is None
    assert summary.jd_match_breakdown is None
    assert summary.missing_required_skills == []
    assert summary.missing_preferred_skills == []
    assert summary.missing_keywords == []
    assert len(summary.matched_skills) > 0

def test_analysis_hash_consistency_and_invalidation(sample_resume):
    """Test 7: SHA-256 analysis hash incorporates version, model, resume text, and JD text."""
    jd_1 = JobDescriptionRequest(text="Python and Docker")
    jd_2 = JobDescriptionRequest(text="Java and Spring")

    hash_1a = compute_analysis_hash(sample_resume.raw_text, jd_1.text)
    hash_1b = compute_analysis_hash(sample_resume.raw_text, jd_1.text)
    hash_2 = compute_analysis_hash(sample_resume.raw_text, jd_2.text)
    hash_standalone = compute_analysis_hash(sample_resume.raw_text, None)

    # Identical inputs yield identical hashes
    assert hash_1a == hash_1b
    # Different JD yields different hash
    assert hash_1a != hash_2
    # Standalone yields distinct hash with NO_JD
    assert hash_1a != hash_standalone
    assert len(hash_1a) == 64  # SHA-256 hex length

def test_required_vs_preferred_skill_extraction(sample_resume):
    """Test 8: Required vs Preferred skill extraction and scoring."""
    jd = JobDescriptionRequest(
        title="Backend Engineer",
        text=(
            "Minimum Requirements:\n"
            "- Python\n"
            "- PostgreSQL\n"
            "- Kubernetes\n\n"
            "Nice to have / Preferred:\n"
            "- React\n"
            "- Redis\n"
        )
    )
    summary = run_deterministic_analysis(sample_resume, jd)

    assert "Kubernetes" in summary.missing_required_skills
    assert "Python" in summary.matched_skills
    assert "PostgreSQL" in summary.matched_skills
    assert summary.jd_match_breakdown is not None
    assert 0 <= summary.jd_match_breakdown.required_skills <= 100
    assert 0 <= summary.jd_match_breakdown.preferred_skills <= 100

def test_empty_or_minimal_document_graceful_handling():
    """Test 9: Minimal or empty document handles gracefully without exceptions."""
    minimal_doc = NormalizedDocument(
        document_id="doc_minimal",
        filename="empty.pdf",
        mime_type="application/pdf",
        page_count=1,
        sections=[],
        raw_text=""
    )
    empty_jd = JobDescriptionRequest(text="")

    summary = run_deterministic_analysis(minimal_doc, empty_jd)
    assert summary.ats_score >= 0
    assert summary.ats_score <= 100
    assert summary.jd_match_score is None
