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

class ATSBreakdown(BaseModel):
    parseability: float          # 0 to 100
    standard_sections: float     # 0 to 100
    contact_info: float          # 0 to 100
    skills_inventory: float      # 0 to 100
    experience_projects: float   # 0 to 100
    formatting_safety: float     # 0 to 100
    content_optimization: float  # 0 to 100

class JDMatchBreakdown(BaseModel):
    required_skills: float       # 0 to 100
    preferred_skills: float      # 0 to 100
    technical_keywords: float    # 0 to 100
    semantic_similarity: float   # 0 to 100
    experience_match: float      # 0 to 100
    education_match: float       # 0 to 100
    projects_experience: float   # 0 to 100

class AnalysisSummary(BaseModel):
    # Overall and core scores
    overall_match_score: float  # Displays ATS score in standalone, or JD match in targeted
    ats_score: int              # Deterministic ATS Compatibility Score 0-100
    ats_breakdown: ATSBreakdown
    jd_match_score: Optional[int] = None # Deterministic JD Match Score 0-100% or None when no JD
    jd_match_breakdown: Optional[JDMatchBreakdown] = None

    # Sub-scores for backwards compatibility
    skills_match_score: float
    experience_match_score: float
    formatting_score: float
    clarity_score: float

    # Issues metrics
    total_suggestions: int
    critical_issues: int
    high_priority_issues: int
    medium_priority_issues: int
    low_priority_issues: int

    # Skills categorization
    matched_skills: List[str] = []
    missing_required_skills: List[str] = []
    missing_preferred_skills: List[str] = []
    missing_keywords: List[str] = []  # Combined missing skills for compatibility

    # Metadata & Section scores
    section_scores: List[SectionScore] = []
    has_jd: bool = False
    analysis_mode: str = "standalone"  # "standalone" or "targeted"
    algorithm_version: str = "2.0"
    semantic_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    analysis_hash: str = ""

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
    source_type: str  # "OFFICIAL_DOCS", "ARTICLE", "GUIDE", "VIDEO", "PRACTICE"
    description: str
    recommended_reading: Optional[str] = None

class StudyTopicModule(BaseModel):
    topic_id: str
    title: str
    skill: Optional[str] = None
    category: str
    priority: str  # "CRITICAL", "IMPORTANT", "SUPPORTING", "OPTIONAL"
    status: Optional[str] = None
    status_label: Optional[str] = None
    estimated_hours: str
    prerequisites: Optional[str] = None
    concepts_to_master: List[str] = []
    why_it_matters_for_role: str
    learning_sources: List[StudySource] = []
    independent_practice_tasks: List[str] = []
    interview_questions: Optional[Dict[str, List[str]]] = None

class SchedulePhase(BaseModel):
    phase_title: str
    focus_summary: str
    deliverables: List[str] = []

class SkillGapSchema(BaseModel):
    skill: str
    category: str
    status: str
    status_label: str
    priority: str
    priority_order: int
    reason: str

class ProjectPrepSchema(BaseModel):
    project_name: str
    tech_stack: List[str] = []
    description: str
    architecture_questions: List[str] = []
    technical_questions: List[str] = []
    challenge_questions: List[str] = []
    resume_verification_questions: List[str] = []

class ReadinessChecklistSchema(BaseModel):
    item_id: str
    category: str
    label: str
    priority: str
    completed: bool = False

class InterviewQuestionItem(BaseModel):
    question_id: str
    question: str
    context: str
    category: str = "TECHNICAL_CONCEPT"
    skill: Optional[str] = None

class InterviewPreparationPlan(BaseModel):
    plan_id: str
    mode: str = "resume_only"  # "resume_only" or "resume_jd"
    role_title: str
    company: str
    has_target_jd: bool = False
    timeline_overview: str
    target_summary: str
    detected_resume_skills: List[str] = []
    detected_resume_skills_categorized: Dict[str, List[str]] = {}
    jd_required_skills: List[str] = []
    jd_preferred_skills: List[str] = []
    skill_gaps: List[SkillGapSchema] = []
    modules: List[StudyTopicModule] = []
    recommended_schedule: List[SchedulePhase] = []
    project_preparation: List[ProjectPrepSchema] = []
    interview_questions_by_category: Dict[str, List[InterviewQuestionItem]] = {}
    likely_interview_questions: List[InterviewQuestionItem] = []
    readiness_checklist: List[ReadinessChecklistSchema] = []
    curated_free_resources: List[StudySource] = []

