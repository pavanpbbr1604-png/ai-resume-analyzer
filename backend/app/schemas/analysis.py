from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from app.schemas.suggestion import AISuggestionItem

class AnalysisStage(BaseModel):
    stage_id: str
    name: str
    status: str  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    message: str

class SectionScore(BaseModel):
    section_name: str
    score: float  # 0 to 100
    details: str

class AnalysisSummary(BaseModel):
    overall_match_score: float  # 0 to 100
    skills_match_score: float
    experience_match_score: float
    formatting_score: float
    clarity_score: float
    total_suggestions: int
    critical_issues: int
    high_priority_issues: int
    medium_priority_issues: int
    low_priority_issues: int
    missing_keywords: List[str] = []
    matched_skills: List[str] = []
    section_scores: List[SectionScore] = []
    has_jd: bool = False
    analysis_mode: str = "standalone"  # "standalone" or "targeted"

class AnalysisResultResponse(BaseModel):
    analysis_id: str
    resume_id: str
    status: str  # PROCESSING, COMPLETED, FAILED
    progress: int  # 0 to 100
    stages: List[AnalysisStage] = []
    summary: Optional[AnalysisSummary] = None
    suggestions: List[AISuggestionItem] = []

# --- Self-Study Interview Preparation Roadmap Schemas ---

class StudySource(BaseModel):
    title: str
    url: str
    source_type: str  # "OFFICIAL_DOCS", "BOOK", "ROADMAP", "GUIDE", "PRACTICE"
    description: str
    recommended_reading: Optional[str] = None

class StudyTopicModule(BaseModel):
    topic_id: str
    title: str
    category: str  # e.g., "CORE_LANGUAGE", "ARCHITECTURE_SYSTEMS", "DATABASES", "SYSTEM_DESIGN", "BEHAVIORAL"
    priority: str  # "CRITICAL", "HIGH", "RECOMMENDED"
    estimated_hours: str
    concepts_to_master: List[str] = []
    why_it_matters_for_role: str
    learning_sources: List[StudySource] = []
    independent_practice_tasks: List[str] = []

class SchedulePhase(BaseModel):
    phase_title: str  # e.g., "Phase 1 (Days 1-3): Core Stack & Language Foundations"
    focus_summary: str
    deliverables: List[str] = []

class ResourceLink(BaseModel):
    platform: str  # "YouTube", "GeeksforGeeks", "W3Schools", "Documentation"
    title: str
    url: str

class SkillResourceItem(BaseModel):
    skill: str
    status: str = "detected"  # "detected" or "not_found_in_resume"
    resources: List[ResourceLink] = []

class InterviewQuestionItem(BaseModel):
    question_id: str
    question: str
    context: str  # e.g. "Based on your Project: Scalable API"
    category: str = "TECHNICAL_CONCEPT"  # "PROJECT_DEEP_DIVE", "TECHNICAL_CONCEPT", "SYSTEM_DESIGN"

class InterviewPreparationPlan(BaseModel):
    plan_id: str
    role_title: str
    company: str
    has_target_jd: bool = False
    timeline_overview: str  # e.g., "14-Day Self-Study Mastery Plan"
    target_summary: str
    modules: List[StudyTopicModule] = []
    recommended_schedule: List[SchedulePhase] = []
    curated_free_resources: List[StudySource] = []
    skill_resources: List[SkillResourceItem] = []
    likely_interview_questions: List[InterviewQuestionItem] = []
