import re
import rapidfuzz
from typing import Optional, Tuple
from app.schemas.document import NormalizedDocument, NormalizedSection, NormalizedParagraph
from app.schemas.suggestion import DocumentLocation

class LocationMappingEngine:
    @staticmethod
    def determine_location_label(
        doc: NormalizedDocument,
        sec: Optional[NormalizedSection],
        p: Optional[NormalizedParagraph]
    ) -> str:
        """
        Derives a human-friendly exact location label (e.g. 'Project: Crowd Density Estimation',
        'Experience: Mercedes-Benz Internship', 'Skills → Programming Languages', 'Education → CMRIT').
        """
        if not sec:
            return "Resume Content"

        heading = sec.heading_text.strip()
        sec_type = sec.section_type.upper() if sec.section_type else ""
        heading_lower = heading.lower()

        # Helper to find entry header in this section
        entry_header = ""
        if p and sec.paragraphs:
            p_idx = -1
            for i, para in enumerate(sec.paragraphs):
                if para.paragraph_id == p.paragraph_id:
                    p_idx = i
                    break
            
            if p_idx >= 0:
                # If current paragraph is not a bullet and looks like a header, use it
                if not p.is_bullet and len(p.full_text) < 70 and not p.full_text.endswith("."):
                    entry_header = p.full_text.strip()
                else:
                    # Look backwards for the closest non-bullet paragraph or title
                    for prev_idx in range(p_idx - 1, -1, -1):
                        prev_p = sec.paragraphs[prev_idx]
                        if not prev_p.is_bullet and len(prev_p.full_text.strip()) > 0:
                            entry_header = prev_p.full_text.strip()
                            # Clean dates or pipes
                            entry_header = re.split(r'\||\–|\—|\t|\s{3,}', entry_header)[0].strip()
                            break

        if "project" in heading_lower or sec_type == "PROJECTS":
            if entry_header and len(entry_header) < 60:
                clean_title = re.sub(r'^(project\s*:?|title\s*:?)\s*', '', entry_header, flags=re.IGNORECASE).strip()
                return f"Project: {clean_title}" if clean_title else "Project Description"
            return "Projects Section"

        if "experience" in heading_lower or "intern" in heading_lower or sec_type == "EXPERIENCE":
            if entry_header and len(entry_header) < 60:
                clean_title = re.sub(r'^(role\s*:?|company\s*:?)\s*', '', entry_header, flags=re.IGNORECASE).strip()
                return f"Experience: {clean_title}" if clean_title else "Experience Section"
            return "Work Experience"

        if "skill" in heading_lower or sec_type == "SKILLS":
            if p:
                p_lead = p.full_text.split(":")[0].strip()
                if 2 < len(p_lead) < 35 and ":" in p.full_text[:40]:
                    return f"Skills → {p_lead}"
            return "Skills Section"

        if "education" in heading_lower or sec_type == "EDUCATION":
            if entry_header and len(entry_header) < 60:
                return f"Education → {entry_header}"
            return "Education Section"

        if "summary" in heading_lower or sec_type == "SUMMARY" or "objective" in heading_lower:
            return "Professional Summary"

        if heading:
            return heading.title()

        return "Resume Content"

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
        best_sec: Optional[NormalizedSection] = None
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
                    loc_label = LocationMappingEngine.determine_location_label(doc, sec, p)
                    return DocumentLocation(
                        section_id=sec.section_id,
                        paragraph_id=p.paragraph_id,
                        run_ids=[r.run_id for r in p.runs],
                        start_offset=start_off,
                        end_offset=end_off,
                        original_text_snippet=clean_target,
                        paragraph_text_hash=p.text_hash,
                        location_label=loc_label,
                    ), 1.0

                # 2. Fuzzy Ratio Match
                ratio = rapidfuzz.fuzz.partial_ratio(clean_target, p_text) / 100.0
                if ratio > best_score:
                    best_score = ratio
                    best_p = p
                    best_sec = sec

        if best_p and best_sec and best_score > 0.6:
            start_off = 0
            end_off = min(len(original_text), len(best_p.full_text))
            loc_label = LocationMappingEngine.determine_location_label(doc, best_sec, best_p)
            return DocumentLocation(
                section_id=best_sec.section_id,
                paragraph_id=best_p.paragraph_id,
                run_ids=[r.run_id for r in best_p.runs],
                start_offset=start_off,
                end_offset=end_off,
                original_text_snippet=best_p.full_text[:60],
                paragraph_text_hash=best_p.text_hash,
                location_label=loc_label,
            ), round(best_score, 2)

        # Default fallback location if no match
        fallback_p_id = "p_1"
        fallback_hash = "unknown"
        fallback_sec = doc.sections[0] if doc.sections else None
        fallback_p = fallback_sec.paragraphs[0] if fallback_sec and fallback_sec.paragraphs else None
        if fallback_p:
            fallback_p_id = fallback_p.paragraph_id
            fallback_hash = fallback_p.text_hash

        loc_label = LocationMappingEngine.determine_location_label(doc, fallback_sec, fallback_p)

        return DocumentLocation(
            section_id=fallback_sec.section_id if fallback_sec else "sec_summary_01",
            paragraph_id=fallback_p_id,
            run_ids=[],
            start_offset=0,
            end_offset=len(original_text),
            original_text_snippet=original_text[:50],
            paragraph_text_hash=fallback_hash,
            location_label=loc_label,
        ), 0.4

