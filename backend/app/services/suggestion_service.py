from typing import Optional, List, Tuple
from app.schemas.suggestion import AISuggestionItem, SuggestionStatus
from app.services.ai_service import AIService, _ANALYSIS_STORE
from app.services.document_service import DocumentService
from app.services.storage_service import StorageService
from app.document.inheritance_engine import FormattingInheritanceEngine, ConcurrencyConflictException

class SuggestionService:
    @classmethod
    def find_suggestion(cls, suggestion_id: str) -> Tuple[Optional[AISuggestionItem], Optional[str]]:
        for an_id, an_res in _ANALYSIS_STORE.items():
            for sug in an_res.suggestions:
                if sug.suggestion_id == suggestion_id:
                    return sug, an_res.resume_id
        return None, None

    @classmethod
    def apply_suggestion(
        cls,
        suggestion_id: str,
        custom_text: Optional[str] = None
    ) -> bool:
        sug, doc_id = cls.find_suggestion(suggestion_id)
        if not sug or not doc_id:
            return False

        replacement_text = custom_text if custom_text is not None else sug.suggested_text
        work_docx = StorageService.get_working_path(doc_id, ".docx")

        if work_docx.exists():
            engine = FormattingInheritanceEngine()
            # Try applying replacement to DOCX
            p_idx = 1
            try:
                if sug.location and sug.location.paragraph_id:
                    parts = sug.location.paragraph_id.split("_")
                    if len(parts) >= 2 and parts[-1].isdigit():
                        p_idx = int(parts[-1])
            except Exception:
                pass

            success = engine.update_docx_file(
                file_path=work_docx,
                paragraph_index=p_idx,
                original_text=sug.original_text,
                suggested_text=replacement_text,
                expected_hash=sug.location.paragraph_text_hash if sug.location else None,
            )

            if not success:
                # If hash check / paragraph index failed, attempt loose string replacement
                success = engine.update_docx_file(
                    file_path=work_docx,
                    paragraph_index=-1,
                    original_text=sug.original_text,
                    suggested_text=replacement_text,
                )

        sug.status = SuggestionStatus.CUSTOM_APPLIED if custom_text else SuggestionStatus.APPLIED
        sug.suggested_text = replacement_text
        
        # Save version snapshot
        DocumentService.increment_version(doc_id, ".docx")

        return True

    @classmethod
    def ignore_suggestion(cls, suggestion_id: str) -> bool:
        sug, doc_id = cls.find_suggestion(suggestion_id)
        if not sug:
            return False
        sug.status = SuggestionStatus.IGNORED
        return True
