import rapidfuzz
from typing import Optional, Tuple
from app.schemas.document import NormalizedDocument, NormalizedParagraph
from app.schemas.suggestion import DocumentLocation

class LocationMappingEngine:
    @staticmethod
    def find_location(
        doc: NormalizedDocument,
        original_text: str,
        section_hint: Optional[str] = None
    ) -> Tuple[DocumentLocation, float]:
        """
        Locates original_text inside normalized document sections/paragraphs.
        Returns DocumentLocation and confidence score (0.0 to 1.0).
        """
        clean_target = original_text.strip()
        best_p: Optional[NormalizedParagraph] = None
        best_sec_id: str = "sec_summary_01"
        best_score: float = 0.0
        start_off: int = 0
        end_off: int = len(original_text)

        for sec in doc.sections:
            for p in sec.paragraphs:
                p_text = p.full_text
                
                # 1. Exact Substring Match
                if clean_target in p_text:
                    start_off = p_text.find(clean_target)
                    end_off = start_off + len(clean_target)
                    return DocumentLocation(
                        section_id=sec.section_id,
                        paragraph_id=p.paragraph_id,
                        run_ids=[r.run_id for r in p.runs],
                        start_offset=start_off,
                        end_offset=end_off,
                        original_text_snippet=clean_target,
                        paragraph_text_hash=p.text_hash,
                    ), 1.0

                # 2. Fuzzy Ratio Match
                ratio = rapidfuzz.fuzz.partial_ratio(clean_target, p_text) / 100.0
                if ratio > best_score:
                    best_score = ratio
                    best_p = p
                    best_sec_id = sec.section_id

        if best_p and best_score > 0.6:
            start_off = 0
            end_off = min(len(original_text), len(best_p.full_text))
            return DocumentLocation(
                section_id=best_sec_id,
                paragraph_id=best_p.paragraph_id,
                run_ids=[r.run_id for r in best_p.runs],
                start_offset=start_off,
                end_offset=end_off,
                original_text_snippet=best_p.full_text[:60],
                paragraph_text_hash=best_p.text_hash,
            ), round(best_score, 2)

        # Default fallback location if no match
        fallback_p_id = "p_1"
        fallback_hash = "unknown"
        if doc.sections and doc.sections[0].paragraphs:
            fallback_p_id = doc.sections[0].paragraphs[0].paragraph_id
            fallback_hash = doc.sections[0].paragraphs[0].text_hash

        return DocumentLocation(
            section_id="sec_summary_01",
            paragraph_id=fallback_p_id,
            run_ids=[],
            start_offset=0,
            end_offset=len(original_text),
            original_text_snippet=original_text[:50],
            paragraph_text_hash=fallback_hash,
        ), 0.4
