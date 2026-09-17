import os
import pytest
from app.services.document_service import DocumentService
from app.services.ai_service import AIService
from app.schemas.job_description import JobDescriptionRequest

TESTING_RESUME_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "testing resume", "1CR23CS127_PAVANBR_RESUME.pdf"
    )
)

def test_testing_resume_parsing_and_analysis():
    assert os.path.exists(TESTING_RESUME_PATH), f"Testing resume file not found at {TESTING_RESUME_PATH}"

    # Read binary bytes of testing resume
    with open(TESTING_RESUME_PATH, "rb") as f:
        content = f.read()

    # Process document upload in DocumentService
    norm_doc = DocumentService.process_and_store(
        doc_id="doc_test_pavan",
        filename="1CR23CS127_PAVANBR_RESUME.pdf",
        content=content
    )

    assert norm_doc is not None
    assert norm_doc.document_id is not None
    assert len(norm_doc.sections) > 0

    # Execute AI Service analysis on testing resume
    jd_req = JobDescriptionRequest(
        title="Software Engineer",
        company="Tech Corp",
        text="Looking for a Python, React, FastAPI Software Engineer with experience in cloud applications and databases."
    )

    analysis_id = AIService.create_analysis(norm_doc, jd_req)
    analysis = AIService.get_analysis(analysis_id)

    assert analysis is not None
    assert analysis.status == "COMPLETED"
    assert analysis.summary.overall_match_score > 0
    assert len(analysis.suggestions) > 0

    print(f"\nSUCCESS: Parsed {len(norm_doc.sections)} sections and generated {len(analysis.suggestions)} suggestions for testing resume!")
