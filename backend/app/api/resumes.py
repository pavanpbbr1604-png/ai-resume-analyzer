import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.document_service import DocumentService
from app.schemas.document import NormalizedDocument

router = APIRouter(prefix="/resumes", tags=["Resumes"])

@router.post("/upload", response_model=NormalizedDocument)
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename or "resume.docx"
    content = await file.read()
    
    if not (filename.endswith(".docx") or filename.endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Only DOCX and PDF resume files are supported.")
        
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    norm_doc = DocumentService.process_and_store(doc_id, filename, content)
    return norm_doc

@router.get("/{resume_id}", response_model=NormalizedDocument)
async def get_resume(resume_id: str):
    doc = DocumentService.get_document(resume_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Resume document not found.")
    return doc
