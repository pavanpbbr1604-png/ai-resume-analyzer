from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field

class SuggestionCategory(str, Enum):
    CONTENT_RELEVANCE = "CONTENT_RELEVANCE"
    SKILL_ALIGNMENT = "SKILL_ALIGNMENT"
    EXPERIENCE_RELEVANCE = "EXPERIENCE_RELEVANCE"
    RESPONSIBILITY_ALIGNMENT = "RESPONSIBILITY_ALIGNMENT"
    KEYWORD_RELEVANCE = "KEYWORD_RELEVANCE"
    CLARITY = "CLARITY"
    GRAMMAR = "GRAMMAR"
    PUNCTUATION = "PUNCTUATION"
    FORMATTING = "FORMATTING"
    CONSISTENCY = "CONSISTENCY"
    REDUNDANCY = "REDUNDANCY"
    WEAK_WORDING = "WEAK_WORDING"
    SECTION_QUALITY = "SECTION_QUALITY"
    PROFESSIONAL_TONE = "PROFESSIONAL_TONE"
    MISSING_CONTEXT = "MISSING_CONTEXT"

class SuggestionType(str, Enum):
    MISSING_KEYWORD = "MISSING_KEYWORD"
    WEAK_SENTENCE = "WEAK_SENTENCE"
    WEAK_BULLET = "WEAK_BULLET"
    GRAMMAR_ERROR = "GRAMMAR_ERROR"
    PUNCTUATION_ERROR = "PUNCTUATION_ERROR"
    FORMATTING_INCONSISTENCY = "FORMATTING_INCONSISTENCY"
    SPELLING_ERROR = "SPELLING_ERROR"
    REDUNDANT_CONTENT = "REDUNDANT_CONTENT"
    UNCLEAR_CONTENT = "UNCLEAR_CONTENT"
    RELEVANCE_IMPROVEMENT = "RELEVANCE_IMPROVEMENT"
    SKILL_ALIGNMENT = "SKILL_ALIGNMENT"
    EXPERIENCE_ALIGNMENT = "EXPERIENCE_ALIGNMENT"
    SECTION_IMPROVEMENT = "SECTION_IMPROVEMENT"
    SUMMARY_IMPROVEMENT = "SUMMARY_IMPROVEMENT"
    PROJECT_DESCRIPTION = "PROJECT_DESCRIPTION"
    ACHIEVEMENT_CLARITY = "ACHIEVEMENT_CLARITY"
    MISSING_CONTEXT = "MISSING_CONTEXT"
    USER_INPUT_REQUIRED = "USER_INPUT_REQUIRED"

class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class SuggestionStatus(str, Enum):
    PENDING = "PENDING"
    APPLIED = "APPLIED"
    IGNORED = "IGNORED"
    CUSTOM_APPLIED = "CUSTOM_APPLIED"

class DocumentLocation(BaseModel):
    section_id: str
    paragraph_id: str
    run_ids: List[str] = []
    start_offset: int
    end_offset: int
    original_text_snippet: str
    paragraph_text_hash: str

class AISuggestionItem(BaseModel):
    suggestion_id: str
    category: SuggestionCategory
    type: SuggestionType
    severity: SeverityLevel
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    requires_user_confirmation: bool = True
    location: DocumentLocation
    location_confidence: float = 1.0
    original_text: str
    suggested_text: str
    reasoning: str
    why_it_matters: str
    user_prompt_question: Optional[str] = None
    status: SuggestionStatus = SuggestionStatus.PENDING

class ApplySuggestionRequest(BaseModel):
    custom_text: Optional[str] = None

class BatchSuggestionAction(BaseModel):
    suggestion_ids: List[str]
    action: str  # 'apply' or 'ignore'
