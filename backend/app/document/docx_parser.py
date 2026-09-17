import hashlib
import uuid
import docx
import mammoth
from pathlib import Path
from typing import List, Optional, Tuple
from app.schemas.document import (
    NormalizedDocument,
    NormalizedSection,
    NormalizedParagraph,
    NormalizedRun,
    RunFormatting,
)

HEADING_STYLES = {
    "heading 1": "SUMMARY",
    "heading 2": "EXPERIENCE",
    "heading 3": "SKILLS",
    "heading 4": "EDUCATION",
    "title": "HEADER",
}

SECTION_KEYWORDS = {
    "EXPERIENCE": ["experience", "work experience", "employment", "history", "professional experience"],
    "EDUCATION": ["education", "academic", "university", "qualifications", "certifications"],
    "SKILLS": ["skills", "technical skills", "technologies", "competencies", "tools"],
    "PROJECTS": ["projects", "personal projects", "key projects"],
    "SUMMARY": ["summary", "profile", "objective", "about me", "professional summary"],
}

def detect_section_type(text: str) -> Tuple[str, float]:
    clean_text = text.strip().lower()
    for stype, keywords in SECTION_KEYWORDS.items():
        for kw in keywords:
            if kw in clean_text:
                return stype, 0.95
    return "OTHER", 0.5

def extract_color_hex(run: docx.text.run.Run) -> Optional[str]:
    try:
        if run.font.color and run.font.color.rgb:
            return f"#{run.font.color.rgb}"
    except Exception:
        pass
    return None

def parse_docx(file_path: Path, document_id: Optional[str] = None) -> NormalizedDocument:
    if not document_id:
        document_id = f"doc_{uuid.uuid4().hex[:8]}"

    doc = docx.Document(file_path)
    
    sections: List[NormalizedSection] = []
    current_section = NormalizedSection(
        section_id="sec_summary_01",
        heading_text="SUMMARY / PROFILE",
        section_type="SUMMARY",
        confidence=1.0,
        paragraphs=[],
    )
    sections.append(current_section)

    p_counter = 0

    for p_idx, p in enumerate(doc.paragraphs):
        p_text = p.text.strip()
        if not p_text:
            continue

        p_counter += 1
        p_id = f"p_{p_counter}"

        # Check if paragraph is a heading
        style_name = p.style.name.lower() if p.style else ""
        is_heading = style_name.startswith("heading") or style_name == "title"
        
        # Or heuristic check: short all caps or matched keyword
        if not is_heading and len(p_text) < 40:
            stype, conf = detect_section_type(p_text)
            if stype != "OTHER" and conf > 0.8:
                is_heading = True

        if is_heading:
            stype, conf = detect_section_type(p_text)
            sec_id = f"sec_{stype.lower()}_{len(sections)+1}"
            current_section = NormalizedSection(
                section_id=sec_id,
                heading_text=p_text,
                section_type=stype,
                confidence=conf,
                paragraphs=[],
            )
            sections.append(current_section)

        # Parse runs
        runs: List[NormalizedRun] = []
        char_offset = 0
        
        for r_idx, r in enumerate(p.runs):
            r_text = r.text
            if not r_text:
                continue
            
            font_size_pt = None
            if r.font.size:
                font_size_pt = r.font.size.pt
                
            formatting = RunFormatting(
                font_family=r.font.name or "Calibri",
                font_size=font_size_pt or 11.0,
                bold=bool(r.bold),
                italic=bool(r.italic),
                underline=bool(r.underline),
                color=extract_color_hex(r) or "#111827",
                style=r.style.name if r.style else "Normal",
            )
            
            run_len = len(r_text)
            n_run = NormalizedRun(
                run_id=f"r_{p_counter}_{r_idx}",
                index=r_idx,
                text=r_text,
                start_offset=char_offset,
                end_offset=char_offset + run_len,
                formatting=formatting,
            )
            runs.append(n_run)
            char_offset += run_len

        # Check bullet formatting
        is_bullet = False
        bullet_sym = None
        if p.style and "list" in p.style.name.lower():
            is_bullet = True
            bullet_sym = "•"
        elif p_text.startswith("•") or p_text.startswith("-") or p_text.startswith("*"):
            is_bullet = True
            bullet_sym = p_text[0]

        # Calculate text hash
        text_hash = hashlib.sha256(p_text.encode("utf-8")).hexdigest()[:16]

        align_str = "LEFT"
        if p.alignment:
            align_str = str(p.alignment).split(".")[-1]

        norm_p = NormalizedParagraph(
            paragraph_id=p_id,
            index=p_counter,
            is_bullet=is_bullet,
            bullet_symbol=bullet_sym,
            alignment=align_str,
            line_spacing=1.15,
            space_before=0.0,
            space_after=4.0,
            full_text=p_text,
            text_hash=text_hash,
            runs=runs,
        )
        current_section.paragraphs.append(norm_p)

    raw_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())

    return NormalizedDocument(
        document_id=document_id,
        filename=file_path.name,
        mime_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        page_count=max(1, len(doc.paragraphs) // 15),
        sections=[s for s in sections if s.paragraphs or s.heading_text],
        raw_text=raw_text,
    )

def convert_docx_to_html(file_path: Path) -> str:
    """Convert DOCX file to clean HTML string using mammoth."""
    with open(file_path, "rb") as docx_file:
        result = mammoth.convert_to_html(docx_file)
        return result.value
