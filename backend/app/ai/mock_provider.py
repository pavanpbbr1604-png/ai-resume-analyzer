import uuid
from typing import List, Tuple, Dict, Any
from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.suggestion import AISuggestionItem, SeverityLevel
from app.schemas.analysis import (
    AnalysisSummary,
    InterviewPreparationPlan,
    StudyTopicModule,
    StudySource,
    SchedulePhase,
)
from app.ai.provider_interface import AIProviderInterface
from app.analysis.deterministic_analyzer import analyze_deterministic
from app.analysis.job_parser import parse_job_description
from app.analysis.semantic_analyzer import analyze_semantic
from app.analysis.deterministic_scoring import run_deterministic_analysis

class MockAIProvider(AIProviderInterface):
    def analyze_resume(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> List[AISuggestionItem]:
        _, suggestions = self.analyze_resume_full(doc, jd)
        return suggestions

    def analyze_resume_full(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> Tuple[AnalysisSummary, List[AISuggestionItem]]:
        has_jd = bool(jd.text and jd.text.strip())
        
        # 1. Run deterministic rule-based suggestions (formatting, weak verbs, metrics)
        det_suggestions = analyze_deterministic(doc)

        # 2. Run semantic suggestions if JD is present
        all_suggestions = list(det_suggestions)
        if has_jd:
            parsed_jd = parse_job_description(jd)
            sem_suggestions = analyze_semantic(doc, parsed_jd)
            all_suggestions.extend(sem_suggestions)

        crit = sum(1 for s in all_suggestions if s.severity == SeverityLevel.CRITICAL)
        high = sum(1 for s in all_suggestions if s.severity == SeverityLevel.HIGH)
        med = sum(1 for s in all_suggestions if s.severity == SeverityLevel.MEDIUM)
        low = sum(1 for s in all_suggestions if s.severity == SeverityLevel.LOW)

        # 3. Compute 100% deterministic V2 summary & scores
        summary = run_deterministic_analysis(
            doc=doc,
            jd=jd,
            total_suggestions=len(all_suggestions),
            crit_count=crit,
            high_count=high,
            med_count=med,
            low_count=low
        )

        return summary, all_suggestions

    def generate_interview_plan(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> InterviewPreparationPlan:
        from app.analysis.interview_engine import generate_personalized_interview_plan
        plan_dict = generate_personalized_interview_plan(doc, jd)
        return InterviewPreparationPlan(**plan_dict)
