import uuid
from typing import List, Tuple, Dict, Any
from app.schemas.document import NormalizedDocument
from app.schemas.job_description import JobDescriptionRequest
from app.schemas.suggestion import AISuggestionItem, SeverityLevel
from app.schemas.analysis import (
    AnalysisSummary,
    SectionScore,
    InterviewPreparationPlan,
    StudyTopicModule,
    StudySource,
    SchedulePhase,
)
from app.ai.provider_interface import AIProviderInterface
from app.analysis.deterministic_analyzer import analyze_deterministic
from app.analysis.job_parser import parse_job_description, COMMON_TECH_STACK
from app.analysis.semantic_analyzer import analyze_semantic

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
        
        # 1. Run deterministic checks (formatting, weak verbs, metrics)
        det_suggestions = analyze_deterministic(doc)

        # 2. Extract resume full text
        doc_text_parts = []
        for sec in doc.sections:
            for p in sec.paragraphs:
                doc_text_parts.append(p.full_text)
        full_resume_text = " ".join(doc_text_parts).lower()

        # 3. Detect skills present in the resume
        detected_resume_skills = [
            skill for skill in COMMON_TECH_STACK
            if skill.lower() in full_resume_text
        ]
        if not detected_resume_skills:
            detected_resume_skills = ["Software Engineering", "Problem Solving", "System Architecture"]

        if not has_jd:
            # === MODE A: STANDALONE RESUME ATS READINESS (NO JD) ===
            crit = sum(1 for s in det_suggestions if s.severity == SeverityLevel.CRITICAL)
            high = sum(1 for s in det_suggestions if s.severity == SeverityLevel.HIGH)
            med = sum(1 for s in det_suggestions if s.severity == SeverityLevel.MEDIUM)
            low = sum(1 for s in det_suggestions if s.severity == SeverityLevel.LOW)

            # Standalone scoring based on resume health
            formatting_score = round(max(60.0, 100.0 - (low * 3.0)), 1)
            clarity_score = round(max(60.0, 96.0 - (med * 3.5)), 1)
            experience_score = round(max(55.0, 92.0 - (high * 4.0)), 1)
            skills_score = round(min(98.0, 70.0 + min(len(detected_resume_skills) * 3.0, 25.0)), 1)

            overall_ats_score = round(
                (experience_score * 0.35) + (skills_score * 0.30) + (formatting_score * 0.20) + (clarity_score * 0.15) - (crit * 6.0),
                1
            )
            overall_ats_score = max(50.0, min(96.0, overall_ats_score))

            section_scores = [
                SectionScore(
                    section_name="Work Experience & Impact",
                    score=experience_score,
                    details=f"Evaluated bullet action verbs and measurable metrics across {len(doc.sections)} sections."
                ),
                SectionScore(
                    section_name="Technical Skills Inventory",
                    score=skills_score,
                    details=f"Detected {len(detected_resume_skills)} technical core skills directly in the resume."
                ),
                SectionScore(
                    section_name="Resume Formatting & ATS Readability",
                    score=formatting_score,
                    details="Assessment of bullet punctuation, technology capitalization, and layout consistency."
                ),
            ]

            summary = AnalysisSummary(
                overall_match_score=overall_ats_score,
                skills_match_score=skills_score,
                experience_match_score=experience_score,
                formatting_score=formatting_score,
                clarity_score=clarity_score,
                total_suggestions=len(det_suggestions),
                critical_issues=crit,
                high_priority_issues=high,
                medium_priority_issues=med,
                low_priority_issues=low,
                missing_keywords=[],  # Standalone mode: No fake missing keywords!
                matched_skills=detected_resume_skills,
                section_scores=section_scores,
                has_jd=False,
                analysis_mode="standalone",
            )

            return summary, det_suggestions

        # === MODE B: TARGETED RESUME ATS MATCH (WITH JD) ===
        parsed_jd = parse_job_description(jd)
        jd_skills = parsed_jd.get("skills", [])

        matched_skills: List[str] = []
        missing_skills: List[str] = []
        for skill in jd_skills:
            if skill.lower() in full_resume_text:
                matched_skills.append(skill)
            else:
                missing_skills.append(skill)

        # Fallback if JD didn't list any detectable skills
        if not jd_skills:
            matched_skills = detected_resume_skills[:4]
            missing_skills = ["Docker", "Kubernetes", "AWS"]

        # Run semantic checks for missing JD keywords
        sem_suggestions = analyze_semantic(doc, parsed_jd)
        all_suggestions = det_suggestions + sem_suggestions

        crit = sum(1 for s in all_suggestions if s.severity == SeverityLevel.CRITICAL)
        high = sum(1 for s in all_suggestions if s.severity == SeverityLevel.HIGH)
        med = sum(1 for s in all_suggestions if s.severity == SeverityLevel.MEDIUM)
        low = sum(1 for s in all_suggestions if s.severity == SeverityLevel.LOW)

        total_skills_count = max(len(jd_skills), 1)
        skills_ratio = len(matched_skills) / total_skills_count if jd_skills else 0.8
        skills_score = round(max(30.0, min(99.0, skills_ratio * 100.0)), 1)

        formatting_score = round(max(50.0, 100.0 - (low * 3.5)), 1)
        clarity_score = round(max(50.0, 95.0 - (med * 4.0)), 1)
        experience_score = round(max(40.0, min(96.0, (skills_score * 0.7) + 25.0 - (high * 2.0))), 1)

        overall_score = round(
            max(35.0, min(98.0, (skills_score * 0.5) + (experience_score * 0.3) + (formatting_score * 0.1) + (clarity_score * 0.1) - (crit * 8.0))),
            1
        )

        section_scores = [
            SectionScore(
                section_name="Work Experience Match",
                score=experience_score,
                details=f"Experience alignment score based on responsibilities and action verbs against target role."
            ),
            SectionScore(
                section_name="Technical Skills Match",
                score=skills_score,
                details=f"Matched {len(matched_skills)} of {len(jd_skills)} required skill keywords from JD."
            ),
            SectionScore(
                section_name="Formatting & Clarity",
                score=formatting_score,
                details="Evaluation of bullet formatting, punctuation consistency, and layout."
            ),
        ]

        summary = AnalysisSummary(
            overall_match_score=overall_score,
            skills_match_score=skills_score,
            experience_match_score=experience_score,
            formatting_score=formatting_score,
            clarity_score=clarity_score,
            total_suggestions=len(all_suggestions),
            critical_issues=crit,
            high_priority_issues=high,
            medium_priority_issues=med,
            low_priority_issues=low,
            missing_keywords=missing_skills,
            matched_skills=matched_skills,
            section_scores=section_scores,
            has_jd=True,
            analysis_mode="targeted",
        )

        return summary, all_suggestions

    def generate_interview_plan(
        self,
        doc: NormalizedDocument,
        jd: JobDescriptionRequest
    ) -> InterviewPreparationPlan:
        has_jd = bool(jd.text and jd.text.strip())
        role = jd.title if (has_jd and jd.title) else "Software Engineer"
        company = jd.company if (has_jd and jd.company) else "Target Company"

        # Detect resume skills for context
        doc_text_parts = [p.full_text for sec in doc.sections for p in sec.paragraphs]
        full_text = " ".join(doc_text_parts).lower()
        skills = [s for s in COMMON_TECH_STACK if s.lower() in full_text]
        primary_lang = "Python" if "python" in full_text else "JavaScript / TypeScript" if "javascript" in full_text or "typescript" in full_text else "Python"

        modules = [
            StudyTopicModule(
                topic_id="mod_1",
                title=f"Core Language Mastery & Concurrency ({primary_lang})",
                category="CORE_LANGUAGE",
                priority="CRITICAL",
                estimated_hours="6 - 8 Hours",
                concepts_to_master=[
                    "Event Loop & Async I/O (async/await internals, coroutines)",
                    "Memory management, garbage collection, and profiling",
                    "Type hinting, strict validation, and modern syntax features",
                    "Multithreading vs Multiprocessing trade-offs"
                ],
                why_it_matters_for_role=f"Interviewers assess whether you write production-grade, performant {primary_lang} code or rely on surface-level abstractions.",
                learning_sources=[
                    StudySource(
                        title=f"Official {primary_lang} Documentation",
                        url="https://docs.python.org/3/library/asyncio.html" if primary_lang == "Python" else "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
                        source_type="OFFICIAL_DOCS",
                        description=f"Primary reference for {primary_lang} language internals, async concurrency, and runtime specifications.",
                        recommended_reading="Chapters on Concurrency, Asynchronous I/O, and Data Models."
                    ),
                    StudySource(
                        title="Roadmap.sh - Developer Roadmaps",
                        url=f"https://roadmap.sh/{'python' if primary_lang == 'Python' else 'javascript'}",
                        source_type="ROADMAP",
                        description="Visual breakdown of essential language milestones from fundamentals to advanced production patterns."
                    )
                ],
                independent_practice_tasks=[
                    "Implement a custom asynchronous rate limiter or task queue using async/await.",
                    "Profile a sample script with memory_profiler or cProfile to isolate bottlenecks."
                ]
            ),
            StudyTopicModule(
                topic_id="mod_2",
                title="API Architecture, Middleware & Microservices",
                category="ARCHITECTURE_SYSTEMS",
                priority="CRITICAL",
                estimated_hours="8 - 10 Hours",
                concepts_to_master=[
                    "RESTful architectural constraints vs GraphQL vs gRPC",
                    "Dependency injection, middleware lifecycle, and authentication (JWT / OAuth2)",
                    "Rate limiting, connection pooling, and resilient retry patterns",
                    "Handling high-throughput streaming responses and background workers"
                ],
                why_it_matters_for_role="The JD emphasizes building reliable, scalable service interfaces that integrate cleanly into microservice fabrics.",
                learning_sources=[
                    StudySource(
                        title="FastAPI Official Documentation",
                        url="https://fastapi.tiangolo.com/tutorial/",
                        source_type="OFFICIAL_DOCS",
                        description="Benchmark documentation for async web APIs, Pydantic v2 data models, and dependency injection.",
                        recommended_reading="Sections: Dependencies, Security & OAuth2, Bigger Applications."
                    ),
                    StudySource(
                        title="Martin Fowler - Microservices Architecture Guide",
                        url="https://martinfowler.com/articles/microservices.html",
                        source_type="GUIDE",
                        description="Foundational essay covering service boundaries, data decentralization, and failure handling."
                    )
                ],
                independent_practice_tasks=[
                    "Build a minimal service with authenticated routes, centralized error middleware, and automated OpenAPI documentation.",
                    "Benchmark API response latency using wrk or Locust under 1,000 concurrent requests."
                ]
            ),
            StudyTopicModule(
                topic_id="mod_3",
                title="Database Systems, Query Optimization & Caching",
                category="DATABASES",
                priority="HIGH",
                estimated_hours="6 - 8 Hours",
                concepts_to_master=[
                    "Index types (B-Tree, GIN, Hash) and query execution plans (EXPLAIN ANALYZE)",
                    "Resolving N+1 query problems in ORMs (SQLAlchemy, Prisma)",
                    "Transaction isolation levels (ACID), locking mechanisms, and deadlocks",
                    "Redis caching strategies (Cache-Aside, Write-Through, TTL invalidation)"
                ],
                why_it_matters_for_role="Most backend performance regressions occur at the data tier. Candidates must demonstrate deep query intuition.",
                learning_sources=[
                    StudySource(
                        title="Use The Index, Luke! - Database Indexing Guide",
                        url="https://use-the-index-luke.com/",
                        source_type="GUIDE",
                        description="Free, definitive resource on how relational database indexing and SQL query planners work under the hood."
                    ),
                    StudySource(
                        title="Redis University & Documentation",
                        url="https://redis.io/docs/latest/develop/use/patterns/",
                        source_type="OFFICIAL_DOCS",
                        description="Official patterns for caching, pub/sub, distributed locks (Redlock), and session stores."
                    )
                ],
                independent_practice_tasks=[
                    "Run EXPLAIN ANALYZE on an unindexed JOIN query, apply a composite index, and compare disk I/O costs.",
                    "Implement a Redis Cache-Aside decorator with automatic cache invalidation."
                ]
            ),
            StudyTopicModule(
                topic_id="mod_4",
                title="System Design & Distributed Scalability",
                category="SYSTEM_DESIGN",
                priority="CRITICAL",
                estimated_hours="10 - 12 Hours",
                concepts_to_master=[
                    "Load balancing algorithms (Round Robin, Least Connections, Consistent Hashing)",
                    "Message queues and event-driven architecture (Kafka, RabbitMQ)",
                    "Database sharding, replication, and CAP theorem trade-offs",
                    "Monitoring, observability, and distributed tracing (Prometheus, OpenTelemetry)"
                ],
                why_it_matters_for_role=f"System design rounds test your ability to design resilient architectures that meet {company}'s scale demands.",
                learning_sources=[
                    StudySource(
                        title="System Design Primer by Donne Martin",
                        url="https://github.com/donnemartin/system-design-primer",
                        source_type="BOOK",
                        description="The premier open-source interactive roadmap for preparing for large-scale distributed system design interviews."
                    ),
                    StudySource(
                        title="High Scalability Architecture Case Studies",
                        url="http://highscalability.com/",
                        source_type="GUIDE",
                        description="Real-world engineering case studies from YouTube, Discord, Netflix, and Uber."
                    )
                ],
                independent_practice_tasks=[
                    "Draw out an end-to-end architecture diagram for a URL shortener or real-time analytics pipeline.",
                    "Calculate back-of-the-envelope estimations for 50,000 QPS, bandwidth, and storage capacity over 5 years."
                ]
            ),
            StudyTopicModule(
                topic_id="mod_5",
                title="Behavioral Leadership & STAR Delivery",
                category="BEHAVIORAL",
                priority="HIGH",
                estimated_hours="4 - 5 Hours",
                concepts_to_master=[
                    "Structuring stories using the STAR framework (Situation, Task, Action, Result)",
                    "Articulating engineering trade-offs and resolving architectural disagreements",
                    "Post-mortem analysis: recounting a production incident and lessons learned",
                    "Mentorship, code review leadership, and sprint prioritization"
                ],
                why_it_matters_for_role="Engineering leaders and hiring managers evaluate your communication, team ownership, and humility.",
                learning_sources=[
                    StudySource(
                        title="The STAR Method Preparation Framework",
                        url="https://en.wikipedia.org/wiki/Situation,_task,_action_and_result",
                        source_type="GUIDE",
                        description="Structured technique for answering behavioral interview questions with quantified outcomes."
                    )
                ],
                independent_practice_tasks=[
                    "Draft 5 concise STAR stories based on projects from your resume.",
                    "Record yourself delivering a 2-minute answer for: 'Tell me about a critical production failure you resolved.'"
                ]
            )
        ]

        schedule = [
            SchedulePhase(
                phase_title="Phase 1 (Days 1 - 3): Language & Framework Deep-Dive",
                focus_summary=f"Master {primary_lang} concurrency, event loop mechanics, and modern API architecture.",
                deliverables=["Build async task script", "Review official language docs", "Practice 5 core API design patterns"]
            ),
            SchedulePhase(
                phase_title="Phase 2 (Days 4 - 7): Database Tuning & Caching Patterns",
                focus_summary="Deep dive into indexing, EXPLAIN plans, ORM query optimization, and Redis caching.",
                deliverables=["Analyze slow query logs", "Build Redis cache-aside wrapper", "Complete 3 database scaling scenarios"]
            ),
            SchedulePhase(
                phase_title="Phase 3 (Days 8 - 11): Distributed System Design",
                focus_summary="Study System Design Primer, master load balancing, message queues, and back-of-the-envelope calculations.",
                deliverables=["Design 2 full distributed systems", "Practice back-of-the-envelope math", "Review real-world architectures"]
            ),
            SchedulePhase(
                phase_title="Phase 4 (Days 12 - 14): Behavioral Stories & Mock Synthesis",
                focus_summary="Finalize STAR stories, articulate technical trade-offs, and conduct self-recorded mock rounds.",
                deliverables=["Finalize 5 STAR stories", "Practice answering system design out loud", "Review company tech blog"]
            ),
        ]

        curated_free = [
            StudySource(
                title="System Design Primer",
                url="https://github.com/donnemartin/system-design-primer",
                source_type="ROADMAP",
                description="Comprehensive open-source repository with visual diagrams and interview templates."
            ),
            StudySource(
                title="Roadmap.sh Developer Guides",
                url="https://roadmap.sh",
                source_type="ROADMAP",
                description="Community-driven developer roadmaps covering Backend, DevOps, System Design, and Python."
            ),
            StudySource(
                title="NeetCode Roadmap",
                url="https://neetcode.io/roadmap",
                source_type="PRACTICE",
                description="Structured algorithmic problem-solving roadmap organized by technical patterns."
            ),
            StudySource(
                title="Designing Data-Intensive Applications Summary",
                url="https://github.com/ept/ddia-references",
                source_type="BOOK",
                description="Chapter summaries and references for Martin Kleppmann's landmark distributed systems book."
            )
        ]

        return InterviewPreparationPlan(
            plan_id=f"plan_{uuid.uuid4().hex[:8]}",
            role_title=role,
            company=company,
            has_target_jd=has_jd,
            timeline_overview="14-Day Self-Study Mastery Plan",
            target_summary=(
                f"Curated self-study preparation roadmap customized for {role} at {company}. "
                f"Follow the topic tracks, study the linked official documentation and guides, and execute independent practice tasks."
            ),
            modules=modules,
            recommended_schedule=schedule,
            curated_free_resources=curated_free,
        )
