import fitz  # PyMuPDF
import hashlib
import uuid
from pathlib import Path
from typing import List, Optional
from app.schemas.document import (
    NormalizedDocument,
    NormalizedSection,
    NormalizedParagraph,
    NormalizedRun,
    RunFormatting,
)

KNOWN_SECTION_TYPES = {
    "SKILLS": ["SKILLS", "TECHNICAL SKILLS", "KEY SKILLS", "COMPETENCIES", "CORE COMPETENCIES", "SKILLS & INTERESTS"],
    "EXPERIENCE": ["EXPERIENCE", "WORK EXPERIENCE", "EMPLOYMENT HISTORY", "PROFESSIONAL EXPERIENCE", "WORK HISTORY"],
    "EDUCATION": ["EDUCATION", "ACADEMIC BACKGROUND", "QUALIFICATIONS", "EDUCATION & TRAINING"],
    "PROJECTS": ["PROJECTS", "PERSONAL PROJECTS", "ACADEMIC PROJECTS", "KEY PROJECTS"],
    "SUMMARY": ["SUMMARY", "PROFESSIONAL SUMMARY", "PROFILE", "CAREER OBJECTIVE", "OBJECTIVE", "ABOUT ME"],
}

def _detect_section_type(heading_text: str) -> str:
    upper = heading_text.upper().strip()
    for sec_type, keywords in KNOWN_SECTION_TYPES.items():
        if any(kw in upper for kw in keywords):
            return sec_type
    return "UNKNOWN"

def parse_pdf(file_path: Path, document_id: Optional[str] = None) -> NormalizedDocument:
    if not document_id:
        document_id = f"doc_{uuid.uuid4().hex[:8]}"

    doc = fitz.open(file_path)
    page_count = len(doc)
    
    sections: List[NormalizedSection] = []
    current_section = NormalizedSection(
        section_id="sec_pdf_header",
        heading_text="HEADER & CONTACT",
        section_type="HEADER",
        confidence=0.9,
        paragraphs=[],
    )
    sections.append(current_section)

    p_counter = 0
    full_text_list = []
    sec_counter = 0

    for page_num in range(page_count):
        page = doc[page_num]
        text_page = page.get_text("blocks")
        
        for block in text_page:
            if len(block) >= 5 and block[4].strip():
                block_text = block[4].strip()
                full_text_list.append(block_text)
                
                lines = block_text.split("\n")
                for line in lines:
                    line_clean = line.strip()
                    if not line_clean:
                        continue
                    
                    # Check if line is a section heading
                    sec_type = _detect_section_type(line_clean)
                    if sec_type != "UNKNOWN" or (line_clean.isupper() and len(line_clean) < 35):
                        sec_counter += 1
                        current_section = NormalizedSection(
                            section_id=f"sec_pdf_{sec_counter}",
                            heading_text=line_clean,
                            section_type=sec_type if sec_type != "UNKNOWN" else "SECTION",
                            confidence=0.95,
                            paragraphs=[],
                        )
                        sections.append(current_section)
                        continue

                    p_counter += 1
                    p_id = f"p_pdf_{p_counter}"
                    text_hash = hashlib.sha256(line_clean.encode("utf-8")).hexdigest()[:16]

                    run = NormalizedRun(
                        run_id=f"r_pdf_{p_counter}_0",
                        index=0,
                        text=line_clean,
                        start_offset=0,
                        end_offset=len(line_clean),
                        formatting=RunFormatting(
                            font_family="Helvetica",
                            font_size=11.0,
                            bold=False,
                            italic=False,
                            underline=False,
                            color="#111827",
                            style="Normal",
                        ),
                    )

                    norm_p = NormalizedParagraph(
                        paragraph_id=p_id,
                        index=p_counter,
                        is_bullet=line_clean.startswith("•") or line_clean.startswith("-") or line_clean.startswith("*"),
                        bullet_symbol="•" if line_clean.startswith("•") or line_clean.startswith("-") else None,
                        alignment="LEFT",
                        line_spacing=1.15,
                        space_before=0.0,
                        space_after=4.0,
                        full_text=line_clean,
                        text_hash=text_hash,
                        runs=[run],
                    )
                    current_section.paragraphs.append(norm_p)

    # Filter out empty sections
    sections = [s for s in sections if len(s.paragraphs) > 0 or s.heading_text != "HEADER & CONTACT"]

    doc.close()

    raw_text = "\n".join(full_text_list)

    return NormalizedDocument(
        document_id=document_id,
        filename=file_path.name,
        mime_type="application/pdf",
        page_count=page_count,
        sections=sections,
        raw_text=raw_text,
    )

def render_pdf_to_images(file_path: Path, output_dir: Path) -> List[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(file_path)
    rendered_files = []
    
    for page_num in range(len(doc)):
        page = doc[page_num]
        pix = page.get_pixmap(dpi=150)
        out_path = output_dir / f"page_{page_num + 1}.png"
        pix.save(out_path)
        rendered_files.append(out_path)
        
    doc.close()
    return rendered_files
