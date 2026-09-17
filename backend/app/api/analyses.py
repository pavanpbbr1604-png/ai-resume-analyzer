from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.analysis import AnalysisResultResponse, InterviewPreparationPlan
from app.services.document_service import DocumentService
from app.services.ai_service import AIService

router = APIRouter(prefix="/analyses", tags=["Analyses"])

@router.post("", response_model=AnalysisResultResponse)
async def create_analysis(
    jd: Optional[JobDescriptionRequest] = None,
    resume_id: str = Query(...)
):
    doc = DocumentService.get_document(resume_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
        
    actual_jd = jd or JobDescriptionRequest(text="")
    analysis_id = AIService.create_analysis(doc, actual_jd)
    analysis = AIService.get_analysis(analysis_id)
    return analysis

@router.get("/{analysis_id}", response_model=AnalysisResultResponse)
async def get_analysis(analysis_id: str):
    analysis = AIService.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis

@router.post("/enhance-bullet")
async def enhance_bullet(payload: dict):
    bullet_text = payload.get("bullet_text", "")
    target_role = payload.get("target_role", "Software Engineer")
    options = AIService.enhance_bullet(bullet_text, target_role)
    return {"status": "success", "options": options}

# Cover letter option temporarily disabled for now; will be restored when needed.
@router.post("/cover-letter", deprecated=True)
async def generate_cover_letter(
    jd: Optional[JobDescriptionRequest] = None,
    resume_id: str = Query(...)
):
    raise HTTPException(status_code=410, detail="Cover letter generator has been temporarily disabled.")

@router.post("/interview-plan", response_model=InterviewPreparationPlan)
async def get_interview_plan(
    jd: Optional[JobDescriptionRequest] = None,
    resume_id: str = Query(...)
):
    doc = DocumentService.get_document(resume_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    actual_jd = jd or JobDescriptionRequest(text="")
    plan = AIService.generate_interview_plan(doc, actual_jd)
    return plan

@router.post("/interview-questions")
async def predict_interview_questions(
    jd: Optional[JobDescriptionRequest] = None,
    resume_id: str = Query(...)
):
    doc = DocumentService.get_document(resume_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found.")
    actual_jd = jd or JobDescriptionRequest(text="")
    questions = AIService.predict_interview_questions(doc, actual_jd)
    return {"status": "success", "questions": questions}
