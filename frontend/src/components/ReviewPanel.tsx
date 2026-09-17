import React, { useState } from 'react';
import {
  AISuggestionItem,
  AnalysisSummary,
  InterviewPreparationPlan,
} from '../types';
import { SuggestionCard } from './SuggestionCard';
import { api } from '../services/api';
import {
  Zap,
  ArrowLeft,
  Copy,
  Check,
  BookOpen,
  ExternalLink,
  Clock,
  Target,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Bookmark,
  Sparkles,
} from 'lucide-react';

interface ReviewPanelProps {
  summary?: AnalysisSummary;
  suggestions: AISuggestionItem[];
  selectedSuggestionId?: string;
  onSelectSuggestion: (suggestionId: string) => void;
  onApply: (suggestionId: string) => void;
  onIgnore: (suggestionId: string) => void;
  onEdit: (suggestion: AISuggestionItem) => void;
  documentId?: string;
  activeTab?: 'suggestions' | 'enhancer' | 'interview';
  onTabChange?: (tab: 'suggestions' | 'enhancer' | 'interview') => void;
  currentJdText?: string;
  onOpenJdInput?: () => void;
}

export const ReviewPanel: React.FC<ReviewPanelProps> = ({
  summary,
  suggestions,
  selectedSuggestionId,
  onSelectSuggestion,
  onApply,
  onIgnore,
  onEdit,
  documentId,
  activeTab: propActiveTab,
  onTabChange,
  currentJdText = '',
  onOpenJdInput,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'suggestions' | 'enhancer' | 'interview'>('suggestions');
  const activeTab = propActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'suggestions' | 'enhancer' | 'interview') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };
  const [filter, setFilter] = useState<string>('ALL');

  // Bullet Enhancer state
  const [inputBullet, setInputBullet] = useState<string>('');
  const [enhancedOptions, setEnhancedOptions] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  // Interview Study Plan state
  const [interviewPlan, setInterviewPlan] = useState<InterviewPreparationPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);

  const hasJd = summary?.has_jd ?? Boolean(currentJdText && currentJdText.trim());
  const overallScore = summary?.overall_match_score || 88;
  const matchedSkills = summary?.matched_skills || ['PYTHON', 'REACT', 'FASTAPI', 'SQL'];
  const missingSkills = summary?.missing_keywords || [];

  /**
   * Allow-list of domains we trust for learning resource URLs.
   * Any URL not on this list will be replaced with a safe YouTube search URL.
   * This prevents the LLM from injecting hallucinated/fabricated URLs into the UI.
   */
  const SAFE_URL_DOMAINS = [
    'docs.python.org', 'developer.mozilla.org', 'fastapi.tiangolo.com',
    'reactjs.org', 'react.dev', 'nodejs.org', 'redis.io', 'postgresql.org',
    'use-the-index-luke.com', 'martinfowler.com', 'roadmap.sh',
    'github.com', 'neetcode.io', 'en.wikipedia.org', 'docs.docker.com',
    'kubernetes.io', 'aws.amazon.com', 'typescript-lang.org', 'typescriptlang.org',
    'expressjs.com', 'youtube.com', 'geeksforgeeks.org', 'w3schools.com',
    'docs.djangoproject.com', 'flask.palletsprojects.com', 'sqlalchemy.org',
    'alembic.sqlalchemy.org', 'pydantic.dev', 'uvicorn.org',
    'leetcode.com', 'hackerrank.com', 'cs.stanford.edu', 'web.dev',
  ];

  /**
   * Returns the URL if it points to a trusted domain, otherwise returns
   * a safe YouTube search URL for the given topic title.
   */
  const getSafeResourceUrl = (url: string, fallbackTitle: string): string => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, '');
      if (SAFE_URL_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))) {
        return url;
      }
    } catch {
      // invalid URL — fall through to YouTube search
    }
    const query = encodeURIComponent(`${fallbackTitle} tutorial guide`);
    return `https://www.youtube.com/results?search_query=${query}`;
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return s.severity === 'CRITICAL' || s.severity === 'HIGH';
    if (filter === 'SKILLS') return s.category === 'SKILL_ALIGNMENT' || s.category === 'KEYWORD_RELEVANCE';
    if (filter === 'GRAMMAR') return s.category === 'GRAMMAR' || s.category === 'PUNCTUATION' || s.category === 'FORMATTING';
    if (filter === 'RELEVANCE') return s.category === 'CONTENT_RELEVANCE' || s.category === 'EXPERIENCE_RELEVANCE' || s.category === 'WEAK_WORDING';
    return true;
  });

  const handleEnhanceBullet = async () => {
    if (!inputBullet.trim()) return;
    setIsEnhancing(true);
    try {
      const options = await api.enhanceBullet(inputBullet);
      setEnhancedOptions(options);
    } catch (err) {
      console.error('Enhance failed:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleFetchInterviewPlan = async () => {
    setIsLoadingPlan(true);
    try {
      if (documentId && !documentId.startsWith('doc_sample')) {
        const plan = await api.getInterviewPlan(documentId, currentJdText);
        setInterviewPlan(plan);
        if (plan.modules.length > 0) {
          setExpandedTopicId(plan.modules[0].topic_id);
        }
      } else {
        throw new Error('Using local plan generator');
      }
    } catch {
      // High-quality local self-study plan
      const defaultPlan: InterviewPreparationPlan = {
        plan_id: 'plan_demo_01',
        role_title: hasJd ? 'Target Role' : 'Software Engineer',
        company: hasJd ? 'Target Company' : 'General Tech Company',
        has_target_jd: hasJd,
        timeline_overview: '14-Day Structured Self-Study Roadmap',
        target_summary:
          'Structured self-study roadmap tailored to core backend & system architecture expectations. Work through each module, study the curated official docs and guides, and implement the independent practice tasks.',
        modules: [
          {
            topic_id: 'mod_1',
            title: 'Python Internals, Concurrency & Async I/O',
            category: 'CORE_LANGUAGE',
            priority: 'CRITICAL',
            estimated_hours: '6 - 8 Hours',
            concepts_to_master: [
              'Event Loop & async/await mechanics under the hood',
              'GIL trade-offs (Global Interpreter Lock) vs multiprocessing',
              'Memory management, object referencing, and gc tuning',
              'Type hinting with Pydantic v2 and strict validation',
            ],
            why_it_matters_for_role:
              'Senior interviewers test whether you understand language runtime behavior and can write non-blocking, memory-efficient code.',
            learning_sources: [
              {
                title: 'Python Official Asyncio Documentation',
                url: 'https://docs.python.org/3/library/asyncio.html',
                source_type: 'OFFICIAL_DOCS',
                description: 'Complete reference for coroutines, event loop lifecycle, and task queues.',
                recommended_reading: 'Sections: Coroutines & Tasks, Streams, Event Loop.',
              },
              {
                title: 'Roadmap.sh - Python Developer Roadmap',
                url: 'https://roadmap.sh/python',
                source_type: 'ROADMAP',
                description: 'Visual mastery roadmap from language foundations to advanced production patterns.',
              },
            ],
            independent_practice_tasks: [
              'Write an asynchronous batching worker that processes 1,000 tasks with controlled concurrency (asyncio.Semaphore).',
              'Profile memory usage of a generator vs list comprehension using memory_profiler.',
            ],
          },
          {
            topic_id: 'mod_2',
            title: 'High-Performance API Architecture & Microservices',
            category: 'ARCHITECTURE_SYSTEMS',
            priority: 'CRITICAL',
            estimated_hours: '8 - 10 Hours',
            concepts_to_master: [
              'RESTful principles vs GraphQL vs gRPC RPC communication',
              'Dependency injection, middleware lifecycle, and authentication (JWT/OAuth2)',
              'Connection pooling, connection exhaustion prevention, and retries with jitter',
              'Rate limiting and automated OpenAPI schema generation',
            ],
            why_it_matters_for_role:
              'Building resilient, high-throughput microservices requires deep familiarity with HTTP lifecycles and middleware isolation.',
            learning_sources: [
              {
                title: 'FastAPI Official Documentation',
                url: 'https://fastapi.tiangolo.com/tutorial/',
                source_type: 'OFFICIAL_DOCS',
                description: 'The standard modern reference for async web APIs, Pydantic v2 schemas, and dependency injection.',
                recommended_reading: 'Tutorial: Dependencies, Security, Background Tasks, Bigger Applications.',
              },
              {
                title: 'Martin Fowler: Microservice Architecture Patterns',
                url: 'https://martinfowler.com/articles/microservices.html',
                source_type: 'GUIDE',
                description: 'Essential architectural guide on bounded contexts, decentralized governance, and fault tolerance.',
              },
            ],
            independent_practice_tasks: [
              'Create a modular FastAPI service with JWT authorization, dependency-injected database sessions, and custom error middleware.',
              'Benchmark endpoint throughput using Locust or wrk under 500 concurrent connections.',
            ],
          },
          {
            topic_id: 'mod_3',
            title: 'Database Systems, Indexing & Redis Caching',
            category: 'DATABASES',
            priority: 'HIGH',
            estimated_hours: '6 - 8 Hours',
            concepts_to_master: [
              'B-Tree and GIN indexes, composite indexing, and EXPLAIN ANALYZE',
              'Resolving N+1 query traps in ORMs like SQLAlchemy and Django',
              'ACID transactions, isolation levels, and row-level locking',
              'Redis caching strategies (Cache-Aside, Write-Through, TTL expiration, invalidation)',
            ],
            why_it_matters_for_role:
              'Database bottlenecks are the #1 cause of production outages. Candidates must demonstrate deep query intuition.',
            learning_sources: [
              {
                title: 'Use The Index, Luke! (SQL Indexing Guide)',
                url: 'https://use-the-index-luke.com/',
                source_type: 'GUIDE',
                description: 'The definitive free interactive guide to database indexing and query execution internals.',
                recommended_reading: 'Chapters: Anatomy of an Index, Where Clause, Sorting & Grouping.',
              },
              {
                title: 'Redis Documentation & Caching Patterns',
                url: 'https://redis.io/docs/latest/develop/use/patterns/',
                source_type: 'OFFICIAL_DOCS',
                description: 'Production architectural patterns for caching, pub/sub, distributed locking, and rate limiting.',
              },
            ],
            independent_practice_tasks: [
              'Create an unindexed table of 100,000 rows, run EXPLAIN ANALYZE, apply a composite index, and observe execution time drop.',
              'Build a reusable Redis Cache-Aside decorator with automatic cache invalidation.',
            ],
          },
          {
            topic_id: 'mod_4',
            title: 'Distributed System Design & Scalability',
            category: 'SYSTEM_DESIGN',
            priority: 'CRITICAL',
            estimated_hours: '10 - 12 Hours',
            concepts_to_master: [
              'Horizontal vs vertical scaling, load balancing algorithms, and consistent hashing',
              'Event-driven message queues (Kafka, RabbitMQ) and asynchronous decoupling',
              'Database sharding, read replicas, and CAP theorem trade-offs',
              'Back-of-the-envelope calculations for QPS, bandwidth, and storage capacity',
            ],
            why_it_matters_for_role:
              'System design rounds test your ability to take vague requirements and architect robust, scalable architectures.',
            learning_sources: [
              {
                title: 'System Design Primer (Donne Martin)',
                url: 'https://github.com/donnemartin/system-design-primer',
                source_type: 'BOOK',
                description: 'The premier open-source interactive repository for mastering scalable system design interviews.',
                recommended_reading: 'System Design Topics: Load Balancing, Caching, Asynchronism, Sharding.',
              },
              {
                title: 'Roadmap.sh - System Design Roadmap',
                url: 'https://roadmap.sh/system-design',
                source_type: 'ROADMAP',
                description: 'Clear step-by-step visual path covering architectural building blocks and trade-offs.',
              },
            ],
            independent_practice_tasks: [
              'Design an end-to-end architecture for a URL Shortener or Real-time Notification System on a whiteboard or draw.io.',
              'Calculate capacity math: 50M daily active users, 5 write requests/day each = calculate QPS and 5-year storage.',
            ],
          },
          {
            topic_id: 'mod_5',
            title: 'Behavioral Mastery & STAR Leadership Delivery',
            category: 'BEHAVIORAL',
            priority: 'HIGH',
            estimated_hours: '4 - 5 Hours',
            concepts_to_master: [
              'STAR Method (Situation, Task, Action, Result) with quantified metrics',
              'Articulating architectural trade-offs and resolving conflicts',
              'Recounting a major production bug or outage with ownership and learnings',
              'Demonstrating engineering leadership, mentorship, and continuous improvement',
            ],
            why_it_matters_for_role:
              'Hiring managers look for humility, proactive ownership, and clear technical storytelling.',
            learning_sources: [
              {
                title: 'The STAR Method Behavioral Guide',
                url: 'https://en.wikipedia.org/wiki/Situation,_task,_action_and_result',
                source_type: 'GUIDE',
                description: 'Structured methodology for framing high-impact behavioral answers.',
              },
            ],
            independent_practice_tasks: [
              'Write down 5 distinct STAR stories mapped to: Leadership, Technical Failure, Disagreement, Tight Deadline, and Scale.',
              'Record a 2-minute spoken answer to: "Tell me about a time you made a major architectural mistake and how you resolved it."',
            ],
          },
        ],
        recommended_schedule: [
          {
            phase_title: 'Phase 1 (Days 1 - 3): Language Internals & API Foundations',
            focus_summary: 'Master async/await concurrency, dependency injection, and middleware lifecycle.',
            deliverables: ['Read Asyncio docs', 'Build async worker script', 'Review modern framework patterns'],
          },
          {
            phase_title: 'Phase 2 (Days 4 - 7): Database Performance & Caching',
            focus_summary: 'Deep dive into indexing, query planners, N+1 query elimination, and Redis caching patterns.',
            deliverables: ['Work through Use The Index, Luke!', 'Build Redis cache-aside wrapper', 'Profile queries'],
          },
          {
            phase_title: 'Phase 3 (Days 8 - 11): Distributed System Design',
            focus_summary: 'Study System Design Primer, master load balancing, message queues, and back-of-the-envelope calculations.',
            deliverables: ['Design 2 full distributed systems', 'Practice capacity math', 'Study high-scalability case studies'],
          },
          {
            phase_title: 'Phase 4 (Days 12 - 14): Behavioral Stories & Final Mock Synthesis',
            focus_summary: 'Prepare 5 STAR stories, practice articulating trade-offs out loud, and research company tech blogs.',
            deliverables: ['Finalize 5 STAR stories', 'Conduct self-recorded mock interview', 'Review target role requirements'],
          },
        ],
        curated_free_resources: [
          {
            title: 'System Design Primer',
            url: 'https://github.com/donnemartin/system-design-primer',
            source_type: 'ROADMAP',
            description: 'Essential open-source visual guide to large-scale system design.',
          },
          {
            title: 'Roadmap.sh Developer Roadmaps',
            url: 'https://roadmap.sh',
            source_type: 'ROADMAP',
            description: 'Community-curated roadmaps for Backend, Frontend, DevOps, and Python.',
          },
          {
            title: 'NeetCode Algorithm Roadmap',
            url: 'https://neetcode.io/roadmap',
            source_type: 'PRACTICE',
            description: 'Structured algorithmic problem-solving patterns.',
          },
          {
            title: 'Designing Data-Intensive Applications References',
            url: 'https://github.com/ept/ddia-references',
            source_type: 'BOOK',
            description: 'Reference notes for Martin Kleppmann\'s landmark distributed systems book.',
          },
        ],
      };
      setInterviewPlan(defaultPlan);
      setExpandedTopicId('mod_1');
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleCopyInterviewPlan = () => {
    if (!interviewPlan) return;
    let md = `# Self-Study Interview Preparation Roadmap: ${interviewPlan.role_title}\n`;
    md += `Company: ${interviewPlan.company}\n`;
    md += `Timeline: ${interviewPlan.timeline_overview}\n\n`;
    md += `## Overview\n${interviewPlan.target_summary}\n\n`;

    md += `## Study Modules to Master\n`;
    interviewPlan.modules.forEach((m, idx) => {
      md += `### ${idx + 1}. ${m.title} [${m.priority}] (Est: ${m.estimated_hours})\n`;
      md += `**Why It Matters:** ${m.why_it_matters_for_role}\n\n`;
      md += `**Key Concepts:**\n`;
      m.concepts_to_master.forEach((c) => (md += `- ${c}\n`));
      md += `\n**Curated Learning Sources:**\n`;
      m.learning_sources.forEach((s) => {
        md += `- [${s.title}](${s.url}) - ${s.description}\n`;
      });
      md += `\n**Independent Practice Tasks:**\n`;
      m.independent_practice_tasks.forEach((t) => (md += `- ${t}\n`));
      md += `\n---\n`;
    });

    md += `\n## Phased Study Schedule\n`;
    interviewPlan.recommended_schedule.forEach((p) => {
      md += `### ${p.phase_title}\n${p.focus_summary}\n`;
      p.deliverables.forEach((d) => (md += `- ${d}\n`));
      md += `\n`;
    });

    navigator.clipboard.writeText(md);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  return (
    <aside className="review-panel flex flex-col gap-4 h-full overflow-hidden">
      {/* Top Metrics Row: ATS MATCH SCORE & SKILL HEATMAP */}
      <div className="flex gap-4 h-44 shrink-0">
        {/* ATS Score Gauge Card */}
        <div className="w-1/3 border border-[#2C3136] bg-[#121416] relative p-4 flex flex-col items-center justify-center overflow-hidden rounded-sm">
          <div className="flex items-center gap-1 mb-2 relative z-10 text-center">
            {hasJd ? (
              <Target size={11} className="text-[#ff5722]" />
            ) : (
              <ShieldCheck size={11} className="text-[#00C853]" />
            )}
            <h3 className="font-label-caps text-[9px] text-[#e4beb4] font-bold tracking-wider">
              {hasJd ? 'ATS ROLE MATCH' : 'GENERAL ATS SCORE'}
            </h3>
          </div>

          <div className="relative w-20 h-20 flex items-center justify-center z-10">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="40" stroke="#2C3136" strokeWidth="8" />
              <circle
                className="transition-all duration-1000 ease-out"
                cx="50"
                cy="50"
                fill="none"
                r="40"
                stroke={hasJd ? '#FF5722' : '#00C853'}
                strokeDasharray="251.2"
                strokeDashoffset={251.2 - (251.2 * overallScore) / 100}
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-glow">
              <span className="font-headline-lg text-2xl text-white font-bold leading-none">{overallScore}</span>
              <span className="font-label-caps text-[9px] text-[#e4beb4] mt-0.5">/ 100</span>
            </div>
          </div>

          <span className="text-[9px] font-mono text-[#8e9196] mt-1 z-10">
            {hasJd ? 'Tailored to JD' : 'Resume Health'}
          </span>
        </div>

        {/* Skill Card: Detected Skills vs JD Match */}
        <div className="flex-1 border border-[#2C3136] bg-[#121416] p-4 relative overflow-hidden flex flex-col rounded-sm">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h3 className="font-label-caps text-[10px] text-[#e4beb4] font-bold tracking-wider flex items-center gap-1.5">
              {hasJd ? 'SKILL & KEYWORD MATCH' : 'IDENTIFIED RESUME SKILLS'}
            </h3>
            <span className="text-[10px] font-mono">
              {hasJd ? (
                <>
                  <span className="text-[#00C853] font-bold">{matchedSkills.length} MATCHED</span>
                  <span className="text-[#8e9196] mx-1">·</span>
                  <span className="text-[#ff5252] font-bold">{missingSkills.length} MISSING</span>
                </>
              ) : (
                <span className="text-[#00C853] font-bold">{matchedSkills.length} DETECTED</span>
              )}
            </span>
          </div>

          {!hasJd ? (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                {matchedSkills.map((sk) => (
                  <span
                    key={sk}
                    title="Detected in your resume"
                    className="px-2 py-0.5 border border-[#00C853]/60 text-[#00C853] font-label-caps text-[10px] bg-[#00C853]/10 flex items-center gap-1 rounded-sm"
                  >
                    <span className="font-bold">✓</span> {sk}
                  </span>
                ))}
              </div>
              <div className="mt-auto pt-2 border-t border-[#2C3136]/60 flex items-center justify-between gap-2 text-[10px] text-[#e4beb4]">
                <span>Add a Job Description to check missing skills</span>
                {onOpenJdInput && (
                  <button
                    onClick={onOpenJdInput}
                    className="text-[#ff5722] hover:underline font-bold font-label-caps text-[10px] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    + ADD JD →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto content-start flex flex-wrap gap-1.5">
              {matchedSkills.map((sk) => (
                <span
                  key={sk}
                  title="Matched skill identified in your resume"
                  className="px-2 py-0.5 border border-[#00C853] text-[#00C853] font-label-caps text-[10px] bg-[#00C853]/10 flex items-center gap-1 rounded-sm"
                >
                  <span className="font-bold">✓</span> {sk}
                </span>
              ))}
              {missingSkills.map((sk) => (
                <span
                  key={sk}
                  title="Required by JD — Not found in resume"
                  className="px-2 py-0.5 border border-[#ff5252] text-[#ff8a80] font-label-caps text-[10px] bg-[#ff5252]/10 flex items-center gap-1 rounded-sm"
                >
                  <span className="font-bold">✕</span> {sk}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-feature Workspace Tabs & Cards */}
      <div className="flex-1 border border-[#2C3136] bg-[#121416] flex flex-col overflow-hidden relative rounded-sm">
        {/* Sub-tabs Navigation */}
        <div className="flex border-b border-[#2C3136] bg-[#121416] shrink-0 overflow-x-auto">
          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors ${
              activeTab === 'suggestions'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => setActiveTab('suggestions')}
          >
            SUGGESTIONS ({suggestions.length})
          </button>

          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors ${
              activeTab === 'enhancer'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => setActiveTab('enhancer')}
          >
            REWRITER
          </button>

          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'interview'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => {
              setActiveTab('interview');
              if (hasJd && !interviewPlan) handleFetchInterviewPlan();
            }}
          >
            <BookOpen size={13} />
            <span>INTERVIEW PREP</span>
          </button>
        </div>

        {/* Tab 1: Suggestions List */}
        {activeTab === 'suggestions' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-2 p-3 border-b border-[#2C3136] bg-[#121416] overflow-x-auto">
              {['ALL', 'CRITICAL', 'SKILLS', 'GRAMMAR', 'RELEVANCE'].map((f) => (
                <button
                  key={f}
                  className={`px-3 py-1 font-label-caps text-[10px] border transition-all ${
                    filter === f
                      ? 'bg-[#ff5722] text-white border-[#ff5722] font-bold glow-orange'
                      : 'bg-[#1e2022] text-[#e4beb4] border-[#2C3136] hover:border-[#ff5722]'
                  }`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {filteredSuggestions.length === 0 ? (
                <div className="text-center py-10 text-[#e4beb4] text-xs font-label-caps">
                  No suggestions matching this filter.
                </div>
              ) : (
                filteredSuggestions.map((sug) => (
                  <SuggestionCard
                    key={sug.suggestion_id}
                    suggestion={sug}
                    isSelected={selectedSuggestionId === sug.suggestion_id}
                    onSelect={() => onSelectSuggestion(sug.suggestion_id)}
                    onApply={onApply}
                    onIgnore={onIgnore}
                    onEdit={onEdit}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: AI Rewriter */}
        {activeTab === 'enhancer' && (
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <button
              onClick={() => setActiveTab('suggestions')}
              className="text-[#ff5722] hover:underline font-label-caps text-xs flex items-center gap-1 self-start"
            >
              <ArrowLeft size={14} /> ← BACK TO SUGGESTIONS
            </button>
            <h3 className="font-headline-md text-md text-[#ffb5a0] flex items-center gap-2">
              <Zap size={16} className="text-[#ff5722]" /> Bullet Rewriter
            </h3>
            <textarea
              value={inputBullet}
              onChange={(e) => setInputBullet(e.target.value)}
              placeholder="Paste a bullet point to improve with action verbs..."
              className="w-full h-24 bg-[#1a1c1e] text-[#e2e2e5] border border-[#2C3136] p-3 text-xs font-mono rounded-sm focus:border-[#ff5722] outline-none"
            />
            <button
              onClick={handleEnhanceBullet}
              disabled={isEnhancing || !inputBullet.trim()}
              className="w-full bg-[#ff5722] text-white py-2 font-label-caps text-xs glow-orange hover:bg-opacity-90 transition-all cursor-pointer font-bold"
            >
              {isEnhancing ? 'ENHANCING...' : 'REWRITE BULLET'}
            </button>
            {enhancedOptions.map((opt, idx) => (
              <div key={idx} className="border border-[#2C3136] bg-[#1a1c1e] p-3 text-xs text-[#00C853] font-mono leading-relaxed">
                <div className="text-[9px] font-label-caps text-[#ff5722] mb-1">OPTION {idx + 1}</div>
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Self-Study Interview Preparation Roadmap */}
        {activeTab === 'interview' && (
          <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
            <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-[#2C3136]">
              <button
                onClick={() => setActiveTab('suggestions')}
                className="text-[#ff5722] hover:underline font-label-caps text-xs flex items-center gap-1"
              >
                <ArrowLeft size={14} /> ← BACK TO SUGGESTIONS
              </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleFetchInterviewPlan}
                      disabled={isLoadingPlan}
                      className="bg-[#1e2022] border border-[#2C3136] text-[#e4beb4] hover:text-[#ff5722] hover:border-[#ff5722] px-2.5 py-1 text-[11px] font-label-caps rounded-sm flex items-center gap-1 transition-colors"
                      title="Re-generate plan"
                    >
                      <Sparkles size={12} />
                      <span>REFRESH</span>
                    </button>
                    {interviewPlan && (
                      <button
                        onClick={handleCopyInterviewPlan}
                        className="bg-[#ff5722] text-white px-3 py-1 text-[11px] font-label-caps font-bold glow-orange hover:bg-opacity-90 transition-all rounded-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedPlan ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copiedPlan ? 'ROADMAP COPIED!' : 'COPY ROADMAP'}</span>
                      </button>
                    )}
                  </div>
                </div>

            {isLoadingPlan ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-8 h-8 border-2 border-[#ff5722] border-t-transparent rounded-full animate-spin"></div>
                <div className="font-label-caps text-xs text-[#e4beb4]">Building Self-Study Curriculum & Curating Learning Sources...</div>
                <div className="text-[11px] text-[#8e9196] max-w-sm">Fetching official docs, study guides, and roadmap milestones for independent preparation.</div>
              </div>
            ) : interviewPlan ? (
              <div className="flex flex-col gap-4">
                {/* Header Banner */}
                <div className="bg-[#181a1c] border border-[#2C3136] p-3 rounded-sm flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-white font-headline-md text-sm font-bold">
                      {interviewPlan.role_title} @ {interviewPlan.company}
                    </span>
                    <span className="px-2 py-0.5 bg-[#ff5722]/15 text-[#ffb5a0] border border-[#ff5722]/40 text-[10px] font-label-caps font-bold rounded-sm">
                      {interviewPlan.has_target_jd ? 'Role-Targeted Plan' : 'Resume-Based Plan'} · {interviewPlan.timeline_overview}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                    {interviewPlan.target_summary}
                  </p>
                </div>

                {/* Topic Modules List */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-caps text-[10px] text-[#e4beb4] font-bold tracking-wider">
                      TOPICS TO MASTER & STUDY SOURCES ({interviewPlan.modules.length})
                    </span>
                    <span className="text-[10px] font-mono text-[#8e9196]">
                      Independent Study Mode
                    </span>
                  </div>

                  {interviewPlan.modules.map((mod) => {
                    const isExpanded = expandedTopicId === mod.topic_id;
                    const priorityColor =
                      mod.priority === 'CRITICAL'
                        ? 'border-[#ff5252] text-[#ff8a80] bg-[#ff5252]/10'
                        : mod.priority === 'HIGH'
                        ? 'border-[#ff9100] text-[#ffb74d] bg-[#ff9100]/10'
                        : 'border-[#29b6f6] text-[#81d4fa] bg-[#29b6f6]/10';

                    return (
                      <div
                        key={mod.topic_id}
                        className={`border rounded-sm transition-colors ${
                          isExpanded ? 'border-[#ff5722] bg-[#1a1c1e]' : 'border-[#2C3136] bg-[#16181a] hover:border-[#3e454d]'
                        }`}
                      >
                        {/* Module Header Bar */}
                        <div
                          onClick={() => setExpandedTopicId(isExpanded ? null : mod.topic_id)}
                          className="p-3 cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 border text-[9px] font-label-caps font-bold rounded-sm ${priorityColor}`}>
                                {mod.priority}
                              </span>
                              <span className="text-[10px] font-mono text-[#8e9196] flex items-center gap-1">
                                <Clock size={11} /> {mod.estimated_hours}
                              </span>
                            </div>
                            <h4 className="font-headline-md text-xs sm:text-sm text-white font-bold truncate">
                              {mod.title}
                            </h4>
                          </div>
                          <span className="text-[#ff5722] font-mono text-sm shrink-0 px-1">
                            {isExpanded ? '−' : '+'}
                          </span>
                        </div>

                        {/* Module Expanded Details */}
                        {isExpanded && (
                          <div className="p-3 pt-0 border-t border-[#2C3136]/70 flex flex-col gap-3 mt-2">
                            {/* Why It Matters */}
                            <div className="bg-[#121416] p-2.5 border border-[#2C3136] rounded-sm text-[11px] text-[#e4beb4] leading-relaxed">
                              <span className="font-bold text-[#ffb5a0]">Why Interviewers Test This: </span>
                              {mod.why_it_matters_for_role}
                            </div>

                            {/* Concepts to Master */}
                            <div>
                              <div className="font-label-caps text-[10px] text-[#ff5722] font-bold mb-1.5">
                                CORE CONCEPTS TO UNDERSTAND:
                              </div>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {mod.concepts_to_master.map((concept, cIdx) => (
                                  <li
                                    key={cIdx}
                                    className="text-[11px] text-white flex items-start gap-1.5 bg-[#121416] p-1.5 border border-[#2C3136]/60 rounded-sm font-mono"
                                  >
                                    <CheckCircle2 size={12} className="text-[#00C853] shrink-0 mt-0.5" />
                                    <span>{concept}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Where to Study: Curated Sources */}
                            <div>
                              <div className="font-label-caps text-[10px] text-[#00C853] font-bold mb-1.5 flex items-center gap-1">
                                <Bookmark size={12} />
                                WHERE TO STUDY (OFFICIAL DOCS & CURATED SOURCES):
                              </div>
                              <div className="flex flex-col gap-2">
                                {mod.learning_sources.map((src, sIdx) => (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 bg-[#121416] border border-[#2C3136] rounded-sm flex flex-col gap-1 hover:border-[#00C853]/60 transition-colors"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <a
                                        href={getSafeResourceUrl(src.url, src.title)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white hover:text-[#ff5722] font-bold text-xs flex items-center gap-1.5 group"
                                      >
                                        <span className="underline underline-offset-2">{src.title}</span>
                                        <ExternalLink size={12} className="text-[#ff5722] group-hover:translate-x-0.5 transition-transform" />
                                      </a>
                                      <span className="px-1.5 py-0.2 text-[9px] font-label-caps border border-[#2C3136] text-[#8e9196] rounded-sm">
                                        {src.source_type}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                                      {src.description}
                                    </p>
                                    {src.recommended_reading && (
                                      <div className="text-[10px] text-[#8e9196] font-mono">
                                        <strong className="text-[#e4beb4]">Recommended Focus:</strong> {src.recommended_reading}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Independent Practice Tasks */}
                            {mod.independent_practice_tasks.length > 0 && (
                              <div>
                                <div className="font-label-caps text-[10px] text-[#ffb5a0] font-bold mb-1.5">
                                  INDEPENDENT PRACTICE TASKS (BUILD & REHEARSE ON YOUR OWN):
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {mod.independent_practice_tasks.map((task, tIdx) => (
                                    <div
                                      key={tIdx}
                                      className="text-[11px] text-[#e2e2e5] font-mono bg-[#121416] p-2 border-l-2 border-[#ff5722] border-t border-r border-b border-[#2C3136] rounded-sm leading-relaxed"
                                    >
                                      {task}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Phased Timeline Schedule */}
                {interviewPlan.recommended_schedule.length > 0 && (
                  <div className="bg-[#181a1c] border border-[#2C3136] p-3 rounded-sm flex flex-col gap-2.5">
                    <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-[#ff5722] font-bold tracking-wider">
                      <Calendar size={13} />
                      RECOMMENDED PHASED STUDY SCHEDULE:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {interviewPlan.recommended_schedule.map((phase, pIdx) => (
                        <div key={pIdx} className="bg-[#121416] p-2.5 border border-[#2C3136] rounded-sm flex flex-col gap-1">
                          <span className="font-headline-md text-xs text-white font-bold">
                            {phase.phase_title}
                          </span>
                          <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                            {phase.focus_summary}
                          </p>
                          {phase.deliverables.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {phase.deliverables.map((d, dIdx) => (
                                <span key={dIdx} className="text-[9px] font-mono text-[#8e9196] bg-[#1a1c1e] px-1.5 py-0.5 border border-[#2C3136] rounded-sm">
                                  • {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free Resource Portals */}
                {interviewPlan.curated_free_resources.length > 0 && (
                  <div className="bg-[#181a1c] border border-[#2C3136] p-3 rounded-sm flex flex-col gap-2">
                    <div className="font-label-caps text-[10px] text-[#00C853] font-bold tracking-wider">
                      ESSENTIAL FREE HUBS & ROADMAPS:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {interviewPlan.curated_free_resources.map((res, rIdx) => (
                        <a
                          key={rIdx}
                          href={getSafeResourceUrl(res.url, res.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#121416] p-2 border border-[#2C3136] rounded-sm flex flex-col hover:border-[#00C853] transition-colors group"
                        >
                          <div className="text-xs text-white font-bold flex items-center justify-between">
                            <span className="group-hover:text-[#00C853] transition-colors">{res.title}</span>
                            <ExternalLink size={11} className="text-[#8e9196]" />
                          </div>
                          <div className="text-[10px] text-[#8e9196] mt-0.5 leading-tight">{res.description}</div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10 flex flex-col items-center gap-3">
                <BookOpen size={36} className="text-[#ff5722]" />
                <div className="font-headline-md text-sm text-white">Interview Preparation Roadmap</div>
                <button
                  onClick={handleFetchInterviewPlan}
                  className="bg-[#ff5722] text-white px-4 py-2 text-xs font-label-caps font-bold glow-orange hover:bg-opacity-90 transition-all rounded-sm cursor-pointer"
                >
                  GENERATE PREP ROADMAP →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
