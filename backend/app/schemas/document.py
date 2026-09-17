from typing import List, Optional
from pydantic import BaseModel, Field

class RunFormatting(BaseModel):
    font_family: Optional[str] = "Calibri"
    font_size: Optional[float] = 11.0
    bold: bool = False
    italic: bool = False
    underline: bool = False
    color: Optional[str] = None
    highlight: Optional[str] = None
    style: Optional[str] = "Normal"

class NormalizedRun(BaseModel):
    run_id: str
    index: int
    text: str
    start_offset: int
    end_offset: int
    formatting: RunFormatting

class NormalizedParagraph(BaseModel):
    paragraph_id: str
    index: int
    is_bullet: bool = False
    bullet_symbol: Optional[str] = None
    alignment: Optional[str] = "LEFT"
    line_spacing: Optional[float] = 1.15
    space_before: Optional[float] = 0.0
    space_after: Optional[float] = 4.0
    full_text: str
    text_hash: str
    runs: List[NormalizedRun] = []

class NormalizedSection(BaseModel):
    section_id: str
    heading_text: str
    section_type: str = "EXPERIENCE"  # SUMMARY, EXPERIENCE, SKILLS, EDUCATION, PROJECTS, OTHER
    confidence: float = 1.0
    paragraphs: List[NormalizedParagraph] = []

class NormalizedDocument(BaseModel):
    document_id: str
    filename: str
    mime_type: str
    page_count: int = 1
    sections: List[NormalizedSection] = []
    tables: List[dict] = []
    raw_text: str = ""
