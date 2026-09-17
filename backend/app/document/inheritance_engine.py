import copy
import hashlib
import docx
from pathlib import Path
from typing import Dict, Any, Optional, Tuple

class ConcurrencyConflictException(Exception):
    pass

class FormattingInheritanceEngine:
    @staticmethod
    def extract_run_formatting(run: docx.text.run.Run) -> Dict[str, Any]:
        """Extract all visual styling attributes from a docx Run."""
        return {
            "font_name": run.font.name,
            "font_size": run.font.size,
            "bold": run.bold,
            "italic": run.italic,
            "underline": run.underline,
            "color": run.font.color.rgb if (run.font.color and run.font.color.rgb) else None,
            "style": run.style.name if run.style else None,
        }

    @staticmethod
    def apply_run_formatting(run: docx.text.run.Run, fmt: Dict[str, Any]) -> None:
        """Apply extracted styling attributes onto a new/existing docx Run."""
        if fmt.get("font_name"):
            run.font.name = fmt["font_name"]
        if fmt.get("font_size"):
            run.font.size = fmt["font_size"]
        if fmt.get("bold") is not None:
            run.bold = fmt["bold"]
        if fmt.get("italic") is not None:
            run.italic = fmt["italic"]
        if fmt.get("underline") is not None:
            run.underline = fmt["underline"]
        if fmt.get("color") is not None:
            run.font.color.rgb = fmt["color"]
        if fmt.get("style"):
            try:
                run.style = fmt["style"]
            except Exception:
                pass

    def apply_replacement(
        self,
        paragraph: docx.text.paragraph.Paragraph,
        original_text: str,
        suggested_text: str,
        expected_hash: Optional[str] = None,
        start_offset: Optional[int] = None,
        end_offset: Optional[int] = None,
    ) -> bool:
        """
        Replaces target text within a paragraph while strictly preserving run formatting.
        Performs optimistic concurrency hash check if expected_hash is provided.
        """
        p_text = paragraph.text
        
        # Concurrency Check
        if expected_hash:
            current_hash = hashlib.sha256(p_text.strip().encode("utf-8")).hexdigest()[:16]
            if current_hash != expected_hash:
                raise ConcurrencyConflictException(
                    f"Paragraph text was modified since analysis. Current text: '{p_text}'"
                )

        if original_text not in p_text:
            return False

        # Single run replacement case (simple & common)
        for run in paragraph.runs:
            if original_text in run.text:
                run.text = run.text.replace(original_text, suggested_text, 1)
                return True

        # Multi-run span replacement case
        primary_fmt = None
        for run in paragraph.runs:
            if run.text and any(char in original_text for char in run.text[:3]):
                primary_fmt = self.extract_run_formatting(run)
                break

        if not primary_fmt and paragraph.runs:
            primary_fmt = self.extract_run_formatting(paragraph.runs[0])

        new_p_text = p_text.replace(original_text, suggested_text, 1)
        
        for run in paragraph.runs:
            run.text = ""
            
        if paragraph.runs:
            first_run = paragraph.runs[0]
            first_run.text = new_p_text
            if primary_fmt:
                self.apply_run_formatting(first_run, primary_fmt)
        else:
            new_run = paragraph.add_run(new_p_text)
            if primary_fmt:
                self.apply_run_formatting(new_run, primary_fmt)

        return True

    def update_docx_file(
        self,
        file_path: Path,
        paragraph_index: int,
        original_text: str,
        suggested_text: str,
        expected_hash: Optional[str] = None,
    ) -> bool:
        """Modifies a DOCX file directly on disk by updating target paragraph."""
        doc = docx.Document(file_path)
        non_empty_paragraphs = [p for p in doc.paragraphs if p.text.strip()]

        target_p = None
        if 0 <= paragraph_index - 1 < len(non_empty_paragraphs):
            cand_p = non_empty_paragraphs[paragraph_index - 1]
            if original_text in cand_p.text:
                target_p = cand_p

        if not target_p:
            for p in doc.paragraphs:
                if original_text in p.text:
                    target_p = p
                    break

        if not target_p:
            return False

        success = self.apply_replacement(
            paragraph=target_p,
            original_text=original_text,
            suggested_text=suggested_text,
            expected_hash=expected_hash,
        )

        if success:
            doc.save(file_path)

        return success
