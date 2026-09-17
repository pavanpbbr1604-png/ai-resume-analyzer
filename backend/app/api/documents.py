from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, HTMLResponse
from app.services.document_service import DocumentService
from app.services.storage_service import StorageService

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.get("/{document_id}/html-preview")
async def get_html_preview(document_id: str):
    html_content = DocumentService.get_html_preview(document_id)
    return HTMLResponse(content=html_content)

@router.post("/{document_id}/undo")
async def undo_document(document_id: str):
    new_v = DocumentService.undo_version(document_id, ".docx")
    if new_v is None:
        raise HTTPException(status_code=400, detail="Cannot undo beyond original version.")
    return {"status": "success", "current_version": new_v}

@router.get("/{document_id}/download")
async def download_document(document_id: str):
    work_path = StorageService.get_working_path(document_id, ".docx")
    if not work_path.exists():
        work_path = StorageService.get_working_path(document_id, ".pdf")
        
    if not work_path.exists():
        raise HTTPException(status_code=404, detail="Document file not found.")
        
    return FileResponse(
        path=work_path,
        filename=f"Updated_{document_id}{work_path.suffix}",
        media_type="application/octet-stream",
    )

@router.get("/{document_id}/editor-config")
async def get_editor_config(document_id: str):
    return {
        "documentType": "word",
        "document": {
            "fileType": "docx",
            "key": f"{document_id}_v{DocumentService.get_version(document_id)}",
            "title": f"Resume_{document_id}.docx",
            "url": f"http://localhost:8000/api/documents/{document_id}/download",
        },
        "editorConfig": {
            "mode": "edit",
            "lang": "en",
            "callbackUrl": f"http://localhost:8000/api/documents/{document_id}/callback",
        }
    }
