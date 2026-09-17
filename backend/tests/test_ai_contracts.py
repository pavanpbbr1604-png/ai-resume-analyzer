import pytest
from app.schemas.suggestion import (
    AISuggestionItem,
    SuggestionCategory,
    SuggestionType,
    SeverityLevel,
    DocumentLocation,
    SuggestionStatus,
)

def test_ai_suggestion_schema_validation():
    loc = DocumentLocation(
        section_id="sec_exp_01",
        paragraph_id="p_1",
        start_offset=0,
        end_offset=10,
        original_text_snippet="Worked on",
        paragraph_text_hash="abc123hash",
    )
    
    sug = AISuggestionItem(
        suggestion_id="sug_01",
        category=SuggestionCategory.WEAK_WORDING,
        type=SuggestionType.WEAK_BULLET,
        severity=SeverityLevel.MEDIUM,
        confidence=0.95,
        location=loc,
        original_text="Worked on",
        suggested_text="Spearheaded",
        reasoning="Strong action verb.",
        why_it_matters="Demonstrates initiative.",
    )
    
    assert sug.suggestion_id == "sug_01"
    assert sug.status == SuggestionStatus.PENDING
    assert sug.location.paragraph_text_hash == "abc123hash"
