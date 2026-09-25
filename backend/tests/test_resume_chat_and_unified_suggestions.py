import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.suggestion import AISuggestionItem, DocumentLocation, SuggestionCategory, SuggestionType, SeverityLevel
from app.services.document_service import _DOC_STORE
from app.services.ai_service import AIService

client = TestClient(app)

@pytest.fixture
def sample_doc():
    doc = NormalizedDocument(
        document_id="doc_chat_test_01",
        filename="Test_Resume.docx",
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        page_count=1,
        sections=[
            NormalizedSection(
                section_id="sec_proj",
                heading_text="PROJECTS",
                section_type="PROJECTS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_proj_title",
                        index=1,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Crowd Density Estimation | YOLOv8, PyTorch",
                        text_hash="hash_title_1",
                        runs=[]
                    ),
                    NormalizedParagraph(
                        paragraph_id="p_proj_bullet",
                        index=2,
                        is_bullet=True,
                        bullet_symbol="•",
                        alignment="LEFT",
                        full_text="Used YOLOv8 to detect people in crowded environments.",
                        text_hash="hash_bullet_1",
                        runs=[]
                    )
                ]
            ),
            NormalizedSection(
                section_id="sec_skills",
                heading_text="TECHNICAL SKILLS",
                section_type="SKILLS",
                confidence=1.0,
                paragraphs=[
                    NormalizedParagraph(
                        paragraph_id="p_sk",
                        index=3,
                        is_bullet=False,
                        alignment="LEFT",
                        full_text="Languages: Python, HTML, CSS, JavaScript",
                        text_hash="hash_sk_1",
                        runs=[]
                    )
                ]
            )
        ],
        raw_text="Crowd Density Estimation | YOLOv8, PyTorch\nUsed YOLOv8 to detect people in crowded environments.\nLanguages: Python, HTML, CSS, JavaScript"
    )
    # Register in document service
    _DOC_STORE[doc.document_id] = doc
    return doc


def test_suggestions_contain_location_label_and_exact_replacements(sample_doc):
    jd = JobDescriptionRequest(text="Seeking a Computer Vision Engineer experienced with YOLOv8 and crowd analysis.")
    an_id = AIService.create_analysis(sample_doc, jd)
    analysis = AIService.get_analysis(an_id)
    assert analysis is not None
    assert len(analysis.suggestions) > 0

    # Verify every suggestion has location_label, original_text, suggested_text, and reasoning
    for sug in analysis.suggestions:
        assert sug.location_label or (sug.location and sug.location.location_label)
        assert sug.original_text.strip() != ""
        assert sug.reasoning.strip() != ""

def test_resume_chat_guardrail_rejects_out_of_scope_queries(sample_doc):
    out_of_scope_queries = [
        "Tell me a joke.",
        "What should I eat for dinner tonight?",
        "What is the weather in New York?",
        "Who is the president of France?",
        "What is the stock price of Tesla?",
        "Help me with my personal relationship advice."
    ]

    for q in out_of_scope_queries:
        response = client.post(
            "/api/analyses/chat",
            json={
                "resume_id": sample_doc.document_id,
                "message": q,
                "history": []
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert data["is_scope_rejection"] is True
        assert "I can help only with your resume and job-description analysis." in data["reply"]

def test_resume_chat_answers_in_scope_resume_queries(sample_doc):
    response = client.post(
        "/api/analyses/chat",
        json={
            "resume_id": sample_doc.document_id,
            "message": "How can I rewrite my project description to make it more action-oriented?",
            "history": []
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["is_scope_rejection"] is False
    assert len(data["reply"]) > 20

def test_resume_chat_with_specific_suggestion_context(sample_doc):
    # Create an analysis first
    an_id = AIService.create_analysis(sample_doc, JobDescriptionRequest(text=""))
    analysis = AIService.get_analysis(an_id)
    assert analysis and len(analysis.suggestions) > 0
    sug = analysis.suggestions[0]

    response = client.post(
        "/api/analyses/chat",
        json={
            "resume_id": sample_doc.document_id,
            "analysis_id": an_id,
            "suggestion_id": sug.suggestion_id,
            "message": "Why did you suggest this change?",
            "history": []
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["suggestion_id"] == sug.suggestion_id
    assert len(data["reply"]) > 20
