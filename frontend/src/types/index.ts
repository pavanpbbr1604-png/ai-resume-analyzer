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

export interface AnalysisSummary {
  overall_match_score: number;
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
  section_scores: SectionScore[];
  has_jd?: boolean;
  analysis_mode?: 'standalone' | 'targeted';
}

export interface AnalysisResultResponse {
  analysis_id: string;
  resume_id: string;
  status: string;
  progress: number;
  summary?: AnalysisSummary;
  suggestions: AISuggestionItem[];
}

// --- Self-Study Interview Preparation Roadmap Types ---

export interface StudySource {
  title: string;
  url: string;
  source_type: 'OFFICIAL_DOCS' | 'BOOK' | 'ROADMAP' | 'GUIDE' | 'PRACTICE' | string;
  description: string;
  recommended_reading?: string;
}

export interface StudyTopicModule {
  topic_id: string;
  title: string;
  category: string;
  priority: 'CRITICAL' | 'HIGH' | 'RECOMMENDED';
  estimated_hours: string;
  concepts_to_master: string[];
  why_it_matters_for_role: string;
  learning_sources: StudySource[];
  independent_practice_tasks: string[];
}

export interface SchedulePhase {
  phase_title: string;
  focus_summary: string;
  deliverables: string[];
}

export interface InterviewPreparationPlan {
  plan_id: string;
  role_title: string;
  company: string;
  has_target_jd: boolean;
  timeline_overview: string;
  target_summary: string;
  modules: StudyTopicModule[];
  recommended_schedule: SchedulePhase[];
  curated_free_resources: StudySource[];
}
