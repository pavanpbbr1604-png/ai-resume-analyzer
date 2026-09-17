import docx
import pytest
from pathlib import Path
from app.document.inheritance_engine import FormattingInheritanceEngine, ConcurrencyConflictException

def test_paragraph_concurrency_conflict_detection(tmp_path):
    doc_path = tmp_path / "conflict_test.docx"
    doc = docx.Document()
    p = doc.add_paragraph("Developed web microservices using Python.")
    doc.save(doc_path)

    engine = FormattingInheritanceEngine()
    
    # Valid expected hash (matches current text)
    valid_hash = "9c235b80a4ff4957"  # SHA256 of "Developed web microservices using Python."
    
    # 1. Simulate user manual edit changing paragraph text
    doc_edited = docx.Document(doc_path)
    doc_edited.paragraphs[0].text = "Developed scalable cloud microservices using Python."
    doc_edited.save(doc_path)

    # 2. AI attempts to apply suggestion with original hash
    doc_check = docx.Document(doc_path)
    p_check = doc_check.paragraphs[0]

    with pytest.raises(ConcurrencyConflictException) as exc_info:
        engine.apply_replacement(
            paragraph=p_check,
            original_text="Developed web microservices",
            suggested_text="Spearheaded web microservices",
            expected_hash=valid_hash,
        )
        
    assert "Paragraph text was modified since analysis" in str(exc_info.value)
