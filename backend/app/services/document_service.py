from pathlib import Path
from typing import Dict, Any, Optional
from app.schemas.document import NormalizedDocument
from app.document.docx_parser import parse_docx, convert_docx_to_html
from app.document.pdf_parser import parse_pdf
from app.services.storage_service import StorageService

# In-memory document store
_DOC_STORE: Dict[str, NormalizedDocument] = {}
_DOC_VERSIONS: Dict[str, int] = {}

class DocumentService:
    @classmethod
    def process_and_store(cls, doc_id: str, filename: str, content: bytes) -> NormalizedDocument:
        orig_path, work_path = StorageService.save_uploaded_file(doc_id, content, filename)
        
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            norm_doc = parse_pdf(work_path, document_id=doc_id)
        else:
            norm_doc = parse_docx(work_path, document_id=doc_id)
            
        _DOC_STORE[doc_id] = norm_doc
        _DOC_VERSIONS[doc_id] = 0
        return norm_doc

    @classmethod
    def get_document(cls, doc_id: str) -> Optional[NormalizedDocument]:
        if doc_id in _DOC_STORE:
            return _DOC_STORE[doc_id]
        
        # Try loading from disk working file
        work_docx = StorageService.get_working_path(doc_id, ".docx")
        if work_docx.exists():
            norm_doc = parse_docx(work_docx, document_id=doc_id)
            _DOC_STORE[doc_id] = norm_doc
            return norm_doc

        work_pdf = StorageService.get_working_path(doc_id, ".pdf")
        if work_pdf.exists():
            norm_doc = parse_pdf(work_pdf, document_id=doc_id)
            _DOC_STORE[doc_id] = norm_doc
            return norm_doc

        return None

    @classmethod
    def get_html_preview(cls, doc_id: str) -> str:
        work_docx = StorageService.get_working_path(doc_id, ".docx")
        if work_docx.exists():
            return convert_docx_to_html(work_docx)
        
        doc = cls.get_document(doc_id)
        if doc:
            # Simple HTML fallback
            html_parts = ["<div class='resume-preview'>"]
            for sec in doc.sections:
                html_parts.append(f"<h2>{sec.heading_text}</h2>")
                for p in sec.paragraphs:
                    if p.is_bullet:
                        html_parts.append(f"<li>{p.full_text}</li>")
                    else:
                        html_parts.append(f"<p>{p.full_text}</p>")
            html_parts.append("</div>")
            return "".join(html_parts)
            
        return "<p>Document not found.</p>"

    @classmethod
    def get_version(cls, doc_id: str) -> int:
        return _DOC_VERSIONS.get(doc_id, 0)

    @classmethod
    def increment_version(cls, doc_id: str, extension: str = ".docx") -> int:
        curr = _DOC_VERSIONS.get(doc_id, 0) + 1
        _DOC_VERSIONS[doc_id] = curr
        StorageService.create_version_snapshot(doc_id, curr, extension)
        
        # Refresh normalized document cache
        work_docx = StorageService.get_working_path(doc_id, ".docx")
        if work_docx.exists():
            _DOC_STORE[doc_id] = parse_docx(work_docx, document_id=doc_id)
            
        return curr

    @classmethod
    def undo_version(cls, doc_id: str, extension: str = ".docx") -> Optional[int]:
        curr = _DOC_VERSIONS.get(doc_id, 0)
        if curr <= 0:
            return None
        target = curr - 1
        success = StorageService.restore_version(doc_id, target, extension)
        if success:
            _DOC_VERSIONS[doc_id] = target
            work_docx = StorageService.get_working_path(doc_id, ".docx")
            if work_docx.exists():
                _DOC_STORE[doc_id] = parse_docx(work_docx, document_id=doc_id)
            return target
        return None
