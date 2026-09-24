export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type SuggestionCategory =
  | 'CONTENT_RELEVANCE'
  | 'SKILL_ALIGNMENT'
  | 'EXPERIENCE_RELEVANCE'
  | 'RESPONSIBILITY_ALIGNMENT'
  | 'KEYWORD_RELEVANCE'
  | 'CLARITY'
  | 'GRAMMAR'
  | 'PUNCTUATION'
  | 'FORMATTING'
  | 'CONSISTENCY'
  | 'REDUNDANCY'
  | 'WEAK_WORDING'
  | 'SECTION_QUALITY'
  | 'PROFESSIONAL_TONE'
  | 'MISSING_CONTEXT';

export type SuggestionStatus = 'PENDING' | 'APPLIED' | 'IGNORED' | 'CUSTOM_APPLIED';

export interface DocumentLocation {
  section_id: string;
  paragraph_id: string;
  run_ids: string[];
  start_offset: number;
  end_offset: number;
  original_text_snippet: string;
  paragraph_text_hash: string;
}

export interface AISuggestionItem {
  suggestion_id: string;
  category: SuggestionCategory;
  type: string;
  severity: SeverityLevel;
  confidence: number;
  requires_user_confirmation: boolean;
  location: DocumentLocation;
  location_confidence: number;
  original_text: string;
  suggested_text: string;
  reasoning: string;
  why_it_matters: string;
  user_prompt_question?: string;
  status: SuggestionStatus;
}

export interface RunFormatting {
  font_family: string;
  font_size: number;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  color?: string;
  style?: string;
}

export interface NormalizedRun {
  run_id: string;
  index: number;
  text: string;
  start_offset: number;
  end_offset: number;
  formatting: RunFormatting;
}

export interface NormalizedParagraph {
  paragraph_id: string;
  index: number;
  is_bullet: boolean;
  bullet_symbol?: string;
  alignment: string;
  line_spacing?: number;
  space_before?: number;
  space_after?: number;
  full_text: string;
  text_hash: string;
  runs: NormalizedRun[];
}

export interface NormalizedSection {
  section_id: string;
  heading_text: string;
  section_type: string;
  confidence: number;
  paragraphs: NormalizedParagraph[];
}

export interface NormalizedDocument {
  document_id: string;
  filename: string;
  mime_type: string;
  page_count: number;
  sections: NormalizedSection[];
  raw_text: string;
}

export interface SectionScore {
  section_name: string;
  score: number;
  details: string;
}

export interface ATSBreakdown {
  parseability: number;          // 0 to 100
  standard_sections: number;     // 0 to 100
  contact_info: number;          // 0 to 100
  skills_inventory: number;      // 0 to 100
  experience_projects: number;   // 0 to 100
  formatting_safety: number;     // 0 to 100
  content_optimization: number;  // 0 to 100
}

export interface JDMatchBreakdown {
  required_skills: number;       // 0 to 100
  preferred_skills: number;      // 0 to 100
  technical_keywords: number;    // 0 to 100
  semantic_similarity: number;   // 0 to 100
  experience_match: number;      // 0 to 100
  education_match: number;       // 0 to 100
  projects_experience: number;   // 0 to 100
}

export interface AnalysisSummary {
  overall_match_score: number;
  ats_score: number;
  ats_breakdown?: ATSBreakdown;
  jd_match_score?: number | null;
  jd_match_breakdown?: JDMatchBreakdown | null;
  skills_match_score: number;
  experience_match_score: number;
  formatting_score: number;
  clarity_score: number;
  total_suggestions: number;
  critical_issues: number;
  high_priority_issues: number;
  medium_priority_issues: number;
  low_priority_issues: number;
  missing_keywords: string[];
  matched_skills: string[];
  missing_required_skills?: string[];
  missing_preferred_skills?: string[];
  section_scores: SectionScore[];
  has_jd?: boolean;
  analysis_mode?: 'standalone' | 'targeted';
  algorithm_version?: string;
  semantic_model?: string;
  analysis_hash?: string;
}

export interface AnalysisResultResponse {
  analysis_id: string;
  resume_id: string;
  status: string;
  progress: number;
  summary?: AnalysisSummary;
  suggestions: AISuggestionItem[];
}

// --- Systematic, Personalized Interview Preparation Engine Types ---

export interface StudySource {
  title: string;
  url: string;
  source_type: 'OFFICIAL_DOCS' | 'ARTICLE' | 'GUIDE' | 'VIDEO' | 'PRACTICE' | string;
  description: string;
  recommended_reading?: string;
}

export interface StudyTopicModule {
  topic_id: string;
  title: string;
  skill?: string;
  category: string;
  priority: 'CRITICAL' | 'IMPORTANT' | 'SUPPORTING' | 'OPTIONAL' | string;
  status?: string;
  status_label?: string;
  estimated_hours: string;
  prerequisites?: string;
  concepts_to_master: string[];
  why_it_matters_for_role: string;
  learning_sources: StudySource[];
  independent_practice_tasks: string[];
  interview_questions?: {
    basic?: string[];
    intermediate?: string[];
    advanced?: string[];
  };
}

export interface SchedulePhase {
  phase_title: string;
  focus_summary: string;
  deliverables: string[];
}

export interface SkillGapItem {
  skill: string;
  category: string;
  status: 'MATCHED' | 'REVISION_NEEDED' | 'REQUIRED_MISSING' | 'PREFERRED_MISSING' | 'OPTIONAL' | string;
  status_label: string;
  priority: 'CRITICAL' | 'IMPORTANT' | 'SUPPORTING' | 'OPTIONAL' | string;
  priority_order: number;
  reason: string;
}

export interface ProjectPrepItem {
  project_name: string;
  tech_stack: string[];
  description: string;
  architecture_questions: string[];
  technical_questions: string[];
  challenge_questions: string[];
  resume_verification_questions: string[];
}

export interface ReadinessChecklistItem {
  item_id: string;
  category: string;
  label: string;
  priority: string;
  completed: boolean;
}

export interface InterviewQuestionItem {
  question_id: string;
  question: string;
  context: string;
  category: string;
  skill?: string;
}

export interface InterviewPreparationPlan {
  plan_id: string;
  mode: 'resume_only' | 'resume_jd' | string;
  role_title: string;
  company: string;
  has_target_jd: boolean;
  timeline_overview: string;
  target_summary: string;
  detected_resume_skills: string[];
  detected_resume_skills_categorized: Record<string, string[]>;
  jd_required_skills: string[];
  jd_preferred_skills: string[];
  skill_gaps: SkillGapItem[];
  modules: StudyTopicModule[];
  recommended_schedule: SchedulePhase[];
  project_preparation: ProjectPrepItem[];
  interview_questions_by_category: Record<string, InterviewQuestionItem[]>;
  likely_interview_questions: InterviewQuestionItem[];
  readiness_checklist: ReadinessChecklistItem[];
  curated_free_resources: StudySource[];
}

