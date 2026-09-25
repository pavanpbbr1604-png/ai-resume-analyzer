import React, { useState } from 'react';
import {
  AISuggestionItem,
  AnalysisSummary,
  InterviewPreparationPlan,
  NormalizedDocument,
} from '../types';
import { SuggestionCard } from './SuggestionCard';
import { ResumeChat } from './ResumeChat';
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
  Layers,
  Code2,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Briefcase,
  HelpCircle,
  ListOrdered,
  CheckSquare,
  Square,
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
  document?: NormalizedDocument | null;
  activeTab?: 'suggestions' | 'chat' | 'enhancer' | 'interview';
  onTabChange?: (tab: 'suggestions' | 'chat' | 'enhancer' | 'interview') => void;
  currentJdText?: string;
  onOpenJdInput?: () => void;
  activeSuggestionForChat?: AISuggestionItem | null;
  onSelectSuggestionForChat?: (suggestion: AISuggestionItem | null) => void;
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
  document,
  activeTab: propActiveTab,
  onTabChange,
  currentJdText = '',
  onOpenJdInput,
  activeSuggestionForChat,
  onSelectSuggestionForChat,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<'suggestions' | 'chat' | 'enhancer' | 'interview'>('suggestions');
  const activeTab = propActiveTab || internalActiveTab;

  const [internalChatSuggestion, setInternalChatSuggestion] = useState<AISuggestionItem | null>(null);
  const activeChatSuggestion = activeSuggestionForChat !== undefined ? activeSuggestionForChat : internalChatSuggestion;

  const setActiveTab = (tab: 'suggestions' | 'chat' | 'enhancer' | 'interview') => {
    setInternalActiveTab(tab);
    if (onTabChange) onTabChange(tab);
  };


  // Bullet Enhancer state
  const [inputBullet, setInputBullet] = useState<string>('');
  const [enhancedOptions, setEnhancedOptions] = useState<string[]>([]);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);

  // Interview Study Plan state
  const [interviewPlan, setInterviewPlan] = useState<InterviewPreparationPlan | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState<boolean>(false);
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  const [activeQuestionCategory, setActiveQuestionCategory] = useState<string>('Fundamentals');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleCheckItem = (id: string) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedChecklistCount = interviewPlan?.readiness_checklist
    ? interviewPlan.readiness_checklist.filter((i) => checkedItems[i.item_id]).length
    : 0;
  const totalChecklistCount = interviewPlan?.readiness_checklist
    ? interviewPlan.readiness_checklist.length
    : 0;

  const hasJd = summary?.has_jd ?? Boolean(currentJdText && currentJdText.trim());
  const atsScore = summary?.ats_score ?? Math.round(summary?.overall_match_score || 80);
  const jdScore = summary?.jd_match_score;

  const matchedSkills = summary?.matched_skills || [];
  const missingReqSkills = summary?.missing_required_skills || [];
  const missingPrefSkills = summary?.missing_preferred_skills || [];

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

  const getSafeResourceUrl = (url: string, fallbackTitle: string): string => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, '');
      if (SAFE_URL_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))) {
        return url;
      }
    } catch {
      // fallback
    }
    const query = encodeURIComponent(`${fallbackTitle} tutorial guide`);
    return `https://www.youtube.com/results?search_query=${query}`;
  };


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
        if (plan.interview_questions_by_category && Object.keys(plan.interview_questions_by_category).length > 0) {
          setActiveQuestionCategory(Object.keys(plan.interview_questions_by_category)[0]);
        }
      } else {
        throw new Error('Using local plan generator');
      }
    } catch {
      const defaultPlan: InterviewPreparationPlan = {
        plan_id: 'plan_demo_01',
        mode: hasJd ? 'resume_jd' : 'resume_only',
        role_title: hasJd ? 'Target Role' : 'Software Engineer',
        company: hasJd ? 'Target Company' : 'General Tech Company',
        has_target_jd: hasJd,
        timeline_overview: '14-Day Structured Self-Study Roadmap',
        target_summary:
          'Structured self-study roadmap tailored to core backend & system architecture expectations.',
        detected_resume_skills: matchedSkills,
        detected_resume_skills_categorized: {
          'Core Skills': matchedSkills,
        },
        jd_required_skills: missingReqSkills,
        jd_preferred_skills: missingPrefSkills,
        skill_gaps: [],
        modules: [],
        recommended_schedule: [],
        project_preparation: [],
        interview_questions_by_category: {},
        likely_interview_questions: [],
        readiness_checklist: [],
        curated_free_resources: [],
      };
      setInterviewPlan(defaultPlan);
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

    navigator.clipboard.writeText(md);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

  return (
    <aside className="review-panel flex flex-col gap-3 h-full overflow-hidden">
      {/* Top Metrics Row: ATS SCORE vs JD MATCH */}
      <div className="grid grid-cols-2 gap-3 shrink-0">
        {/* Card 1: ATS SCORE */}
        <div className="border border-[#2C3136] bg-[#121416] p-3 flex flex-col items-center justify-center rounded-sm relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1 text-center">
            <ShieldCheck size={13} className="text-[#00C853]" />
            <h3 className="font-label-caps text-[10px] text-white font-bold tracking-wider">
              ATS SCORE
            </h3>
          </div>

          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="none" r="38" stroke="#2C3136" strokeWidth="8" />
              <circle
                className="transition-all duration-1000 ease-out"
                cx="50"
                cy="50"
                fill="none"
                r="38"
                stroke="#00C853"
                strokeDasharray="238.76"
                strokeDashoffset={238.76 - (238.76 * atsScore) / 100}
                strokeWidth="8"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-headline-lg text-xl text-white font-bold leading-none">{atsScore}</span>
              <span className="font-label-caps text-[8px] text-[#8e9196]">/ 100</span>
            </div>
          </div>

          <span className="text-[10px] font-medium text-[#00C853] mt-1">
            ATS Compatibility
          </span>
        </div>

        {/* Card 2: JD MATCH */}
        <div className="border border-[#2C3136] bg-[#121416] p-3 flex flex-col items-center justify-center rounded-sm relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1 text-center">
            <Target size={13} className={hasJd ? "text-[#ff5722]" : "text-[#8e9196]"} />
            <h3 className="font-label-caps text-[10px] text-white font-bold tracking-wider">
              JD MATCH
            </h3>
          </div>

          {hasJd && jdScore !== null && jdScore !== undefined ? (
            <>
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="38" stroke="#2C3136" strokeWidth="8" />
                  <circle
                    className="transition-all duration-1000 ease-out"
                    cx="50"
                    cy="50"
                    fill="none"
                    r="38"
                    stroke="#ff5722"
                    strokeDasharray="238.76"
                    strokeDashoffset={238.76 - (238.76 * jdScore) / 100}
                    strokeWidth="8"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline-lg text-xl text-white font-bold leading-none">{jdScore}</span>
                  <span className="font-label-caps text-[8px] text-[#8e9196]">%</span>
                </div>
              </div>
              <span className="text-[10px] font-medium text-[#ff5722] mt-1">
                Resume ↔ Job Match
              </span>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-1">
              <span className="text-xs font-mono text-[#e4beb4] font-medium leading-tight">
                No Job Description Provided
              </span>
              {onOpenJdInput && (
                <button
                  onClick={onOpenJdInput}
                  className="mt-2 text-[#ff5722] hover:underline font-label-caps text-[10px] font-bold cursor-pointer"
                >
                  + ADD TARGET JD →
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skills Summary Banner */}
      {(matchedSkills.length > 0 || (hasJd && (missingReqSkills.length > 0 || missingPrefSkills.length > 0))) && (
        <div className="border border-[#2C3136] bg-[#121416] p-2.5 rounded-sm flex flex-col gap-2 shrink-0">
          {/* Matched Skills */}
          {matchedSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-label-caps text-[#00C853] font-bold shrink-0">MATCHED ({matchedSkills.length}):</span>
              <div className="flex flex-wrap gap-1">
                {matchedSkills.slice(0, 8).map((sk) => (
                  <span
                    key={sk}
                    className="px-1.5 py-0.2 border border-[#00C853]/60 text-[#00C853] font-label-caps text-[9px] bg-[#00C853]/10 rounded-sm"
                  >
                    ✓ {sk}
                  </span>
                ))}
                {matchedSkills.length > 8 && (
                  <span className="text-[9px] text-[#8e9196] font-mono">+{matchedSkills.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {/* Missing Required Skills */}
          {hasJd && missingReqSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-label-caps text-[#ff5252] font-bold shrink-0">MISSING REQUIRED:</span>
              <div className="flex flex-wrap gap-1">
                {missingReqSkills.map((sk) => (
                  <span
                    key={sk}
                    className="px-1.5 py-0.2 border border-[#ff5252] text-[#ff8a80] font-label-caps text-[9px] bg-[#ff5252]/10 rounded-sm"
                  >
                    ✕ {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Preferred Skills */}
          {hasJd && missingPrefSkills.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] font-label-caps text-[#ffb74d] font-bold shrink-0">PREFERRED:</span>
              <div className="flex flex-wrap gap-1">
                {missingPrefSkills.map((sk) => (
                  <span
                    key={sk}
                    className="px-1.5 py-0.2 border border-[#ffb74d] text-[#ffb74d] font-label-caps text-[9px] bg-[#ffb74d]/10 rounded-sm"
                  >
                    ✕ {sk}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* Main Feature Tabs Container */}
      <div className="flex-1 border border-[#2C3136] bg-[#121416] flex flex-col overflow-hidden relative rounded-sm">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2C3136] bg-[#121416] shrink-0 overflow-x-auto">
          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => setActiveTab('suggestions')}
          >
            <Layers size={13} />
            <span>SUGGESTIONS ({suggestions.length})</span>
          </button>

          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => setActiveTab('chat')}
          >
            <Sparkles size={13} className="text-[#ff5722]" />
            <span>RESUME ASSISTANT</span>
          </button>

          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'enhancer'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => setActiveTab('enhancer')}
          >
            <Zap size={13} />
            <span>REWRITER</span>
          </button>

          <button
            className={`px-4 py-3 font-label-caps text-[11px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'interview'
                ? 'text-[#ff5722] border-b-2 border-[#ff5722] bg-[#1a1c1e] font-bold'
                : 'text-[#e4beb4] hover:text-[#ff5722]'
            }`}
            onClick={() => {
              setActiveTab('interview');
              if (!interviewPlan) handleFetchInterviewPlan();
            }}
          >
            <BookOpen size={13} />
            <span>INTERVIEW PREP</span>
          </button>
        </div>

        {/* Tab 1: Continuous Unified Suggestions Feed */}
        {activeTab === 'suggestions' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#2C3136] bg-[#16181a] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-[#ff5722]" />
                <span className="font-label-caps text-xs text-white font-bold tracking-wide">
                  ACTIONABLE IMPROVEMENTS ({suggestions.length})
                </span>
              </div>
              <span className="text-[10px] text-[#8e9196] font-mono">
                Click [Ask Agent] to discuss any item
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {suggestions.length === 0 ? (
                <div className="text-center py-16 text-[#e4beb4] text-xs font-label-caps flex flex-col items-center gap-2.5">
                  <CheckCircle2 size={32} className="text-[#00C853]" />
                  <span className="font-bold text-white text-sm">All Set!</span>
                  <span className="text-[#8e9196]">No additional resume suggestions detected.</span>
                </div>
              ) : (
                suggestions.map((sug) => (
                  <SuggestionCard
                    key={sug.suggestion_id}
                    suggestion={sug}
                    isSelected={selectedSuggestionId === sug.suggestion_id}
                    onSelect={() => onSelectSuggestion(sug.suggestion_id)}
                    onApply={onApply}
                    onIgnore={onIgnore}
                    onEdit={onEdit}
                    onAskAgent={(targetSug) => {
                      setInternalChatSuggestion(targetSug);
                      if (onSelectSuggestionForChat) onSelectSuggestionForChat(targetSug);
                      setActiveTab('chat');
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Resume & JD Improvement Assistant Chat */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <ResumeChat
              documentId={documentId}
              document={document}
              analysisId={summary?.analysis_hash}
              currentJdText={currentJdText}
              activeSuggestion={activeChatSuggestion}
              onClearActiveSuggestion={() => {
                setInternalChatSuggestion(null);
                if (onSelectSuggestionForChat) onSelectSuggestionForChat(null);
              }}
              onApplySuggestion={onApply}
            />
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

        {/* Tab 3: Systematic Personalized Interview Preparation Dashboard */}
        {activeTab === 'interview' && (
          <div className="p-4 flex flex-col gap-5 overflow-y-auto flex-1">
            {/* Top Navigation & Action Controls */}
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
                  className="bg-[#1e2022] border border-[#2C3136] text-[#e4beb4] hover:text-[#ff5722] hover:border-[#ff5722] px-2.5 py-1 text-[11px] font-label-caps rounded-sm flex items-center gap-1 transition-colors cursor-pointer"
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
                    <span>{copiedPlan ? 'COPIED!' : 'COPY ROADMAP'}</span>
                  </button>
                )}
              </div>
            </div>

            {isLoadingPlan ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                <div className="w-8 h-8 border-2 border-[#ff5722] border-t-transparent rounded-full animate-spin"></div>
                <div className="font-label-caps text-xs text-[#e4beb4]">Building Personalized Preparation Roadmap...</div>
                <div className="text-[11px] text-[#8e9196] max-w-sm">
                  Analyzing resume skills, target JD requirements, and mapping official documentation and practice sets.
                </div>
              </div>
            ) : interviewPlan ? (
              <div className="flex flex-col gap-6">
                {/* 1. Header Banner & Mode Indicator */}
                <div className="bg-[#181a1c] border border-[#2C3136] p-4 rounded-sm flex flex-col gap-2 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-headline-md text-base font-bold">
                        {interviewPlan.role_title}
                      </span>
                      <span className="text-[#8e9196] text-xs font-mono">@ {interviewPlan.company}</span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-label-caps font-bold rounded-sm border ${
                        interviewPlan.has_target_jd
                          ? 'bg-[#ff5722]/15 text-[#ffb5a0] border-[#ff5722]/40'
                          : 'bg-[#00C853]/15 text-[#00C853] border-[#00C853]/40'
                      }`}
                    >
                      {interviewPlan.has_target_jd ? 'JOB-SPECIFIC PREPARATION' : 'RESUME-BASED PREPARATION'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                    {interviewPlan.target_summary}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#8e9196] pt-1 border-t border-[#2C3136]/60">
                    <Clock size={12} className="text-[#ff5722]" />
                    <span>Estimated Effort: {interviewPlan.timeline_overview}</span>
                  </div>
                </div>

                {/* 2. Detected Skills Categorization */}
                {interviewPlan.detected_resume_skills_categorized && Object.keys(interviewPlan.detected_resume_skills_categorized).length > 0 && (
                  <div className="flex flex-col gap-2.5 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                      <Code2 size={13} className="text-[#00C853]" />
                      YOUR DETECTED SKILLS (BY CATEGORY):
                    </div>
                    <div className="flex flex-col gap-2">
                      {Object.entries(interviewPlan.detected_resume_skills_categorized).map(([cat, skills]) => (
                        <div key={cat} className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span className="text-[10px] font-mono text-[#8e9196] shrink-0 w-36">{cat}:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {skills.map((sk) => (
                              <span
                                key={sk}
                                className="px-2 py-0.5 bg-[#121416] border border-[#2C3136] text-[#e2e2e5] font-mono text-[11px] rounded-sm hover:border-[#00C853]/60 transition-colors"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Skill Gap & Priority Overview (When JD Present or in Gap Analysis) */}
                {interviewPlan.skill_gaps && interviewPlan.skill_gaps.length > 0 && (
                  <div className="flex flex-col gap-2.5 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                        <AlertTriangle size={13} className="text-[#ff9100]" />
                        SKILL GAP & PRIORITY MATRIX:
                      </div>
                      <span className="text-[10px] font-mono text-[#8e9196]">
                        {interviewPlan.skill_gaps.length} Target Skills
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                      {interviewPlan.skill_gaps.map((gap, gIdx) => {
                        const priorityBadge =
                          gap.priority === 'CRITICAL'
                            ? 'bg-[#ff5252]/15 text-[#ff8a80] border-[#ff5252]'
                            : gap.priority === 'IMPORTANT'
                            ? 'bg-[#ff9100]/15 text-[#ffb74d] border-[#ff9100]'
                            : gap.priority === 'SUPPORTING'
                            ? 'bg-[#29b6f6]/15 text-[#81d4fa] border-[#29b6f6]'
                            : 'bg-[#9e9e9e]/15 text-[#e0e0e0] border-[#9e9e9e]';

                        return (
                          <div
                            key={gIdx}
                            className="bg-[#121416] p-2.5 border border-[#2C3136] rounded-sm flex flex-col gap-1.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-xs font-mono">{gap.skill}</span>
                                <span className="text-[10px] text-[#8e9196]">({gap.category})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.5 border text-[9px] font-label-caps font-bold rounded-sm ${priorityBadge}`}>
                                  {gap.priority}
                                </span>
                                <span className="px-1.5 py-0.5 border border-[#2C3136] text-[9px] font-label-caps text-[#8e9196] rounded-sm">
                                  {gap.status_label}
                                </span>
                              </div>
                            </div>
                            <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                              {gap.reason}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Multi-Phase Study Roadmap Schedule */}
                {interviewPlan.recommended_schedule && interviewPlan.recommended_schedule.length > 0 && (
                  <div className="flex flex-col gap-3 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-[#ff5722] font-bold tracking-wider">
                      <Calendar size={13} />
                      MULTI-PHASE STUDY ROADMAP:
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {interviewPlan.recommended_schedule.map((phase, pIdx) => (
                        <div key={pIdx} className="bg-[#121416] p-3 border border-[#2C3136] rounded-sm flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-headline-md text-xs text-white font-bold">
                              {phase.phase_title}
                            </span>
                            <span className="text-[9px] font-mono text-[#ff5722] border border-[#ff5722]/30 px-1.5 py-0.2 rounded-sm">
                              MILESTONE {pIdx + 1}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#e4beb4] leading-relaxed">
                            {phase.focus_summary}
                          </p>
                          {phase.deliverables && phase.deliverables.length > 0 && (
                            <div className="mt-1 flex flex-col gap-1">
                              <span className="text-[9px] font-label-caps text-[#8e9196] font-bold">KEY DELIVERABLES:</span>
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {phase.deliverables.map((del, dIdx) => (
                                  <li key={dIdx} className="text-[10px] text-[#00C853] font-mono flex items-center gap-1">
                                    <span>▸</span> {del}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Deep-Dive Learning Modules with Verified Resources */}
                {interviewPlan.modules && interviewPlan.modules.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                        <BookOpen size={13} className="text-[#ff5722]" />
                        TOPIC MASTERY & STUDY MODULES:
                      </div>
                      <span className="text-[10px] font-mono text-[#8e9196]">
                        {interviewPlan.modules.length} Modules
                      </span>
                    </div>

                    <div className="flex flex-col gap-3">
                      {interviewPlan.modules.map((mod) => {
                        const isExpanded = expandedTopicId === mod.topic_id;
                        const priorityColor =
                          mod.priority === 'CRITICAL'
                            ? 'border-[#ff5252] text-[#ff8a80] bg-[#ff5252]/10'
                            : mod.priority === 'IMPORTANT'
                            ? 'border-[#ff9100] text-[#ffb74d] bg-[#ff9100]/10'
                            : 'border-[#29b6f6] text-[#81d4fa] bg-[#29b6f6]/10';

                        return (
                          <div
                            key={mod.topic_id}
                            className={`border rounded-sm transition-colors ${
                              isExpanded ? 'border-[#ff5722] bg-[#1a1c1e]' : 'border-[#2C3136] bg-[#16181a] hover:border-[#3e454d]'
                            }`}
                          >
                            <div
                              onClick={() => setExpandedTopicId(isExpanded ? null : mod.topic_id)}
                              className="p-3 cursor-pointer flex items-center justify-between gap-2"
                            >
                              <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`px-1.5 py-0.5 border text-[9px] font-label-caps font-bold rounded-sm ${priorityColor}`}>
                                    {mod.priority}
                                  </span>
                                  {mod.status_label && (
                                    <span className="text-[9px] font-label-caps text-[#8e9196] border border-[#2C3136] px-1 rounded-sm">
                                      {mod.status_label}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-mono text-[#8e9196] flex items-center gap-1">
                                    <Clock size={11} /> {mod.estimated_hours}
                                  </span>
                                </div>
                                <span className="font-headline-md text-xs sm:text-sm text-white font-bold truncate">
                                  {mod.title}
                                </span>
                              </div>
                              <span className="text-[#ff5722] font-mono text-sm shrink-0 px-1">
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </span>
                            </div>

                            {isExpanded && (
                              <div className="p-3 pt-0 border-t border-[#2C3136]/70 flex flex-col gap-3.5 mt-2">
                                {/* Why it matters */}
                                <div className="bg-[#121416] p-2.5 border border-[#2C3136] rounded-sm text-[11px] text-[#e4beb4] leading-relaxed">
                                  <span className="font-bold text-[#ffb5a0]">Why Interviewers Test This: </span>
                                  {mod.why_it_matters_for_role}
                                </div>

                                {mod.prerequisites && (
                                  <div className="text-[10px] font-mono text-[#8e9196] bg-[#121416] p-2 border border-[#2C3136] rounded-sm flex items-center gap-1.5">
                                    <span className="text-[#ff5722] font-bold">PREREQUISITE:</span> {mod.prerequisites}
                                  </div>
                                )}

                                {/* Core Concepts */}
                                {mod.concepts_to_master && mod.concepts_to_master.length > 0 && (
                                  <div>
                                    <div className="font-label-caps text-[10px] text-[#ff5722] font-bold mb-1.5">
                                      CORE CONCEPTS & INTERVIEW TOPICS:
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
                                )}

                                {/* Verified Learning Resources */}
                                {mod.learning_sources && mod.learning_sources.length > 0 && (
                                  <div>
                                    <div className="font-label-caps text-[10px] text-[#00C853] font-bold mb-1.5 flex items-center gap-1">
                                      <Bookmark size={12} />
                                      VERIFIED STUDY RESOURCES (OFFICIAL & TUTORIALS):
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
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Independent Practice Tasks */}
                                {mod.independent_practice_tasks && mod.independent_practice_tasks.length > 0 && (
                                  <div>
                                    <div className="font-label-caps text-[10px] text-[#ffb5a0] font-bold mb-1.5">
                                      CONCRETE PRACTICE TASKS:
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
                  </div>
                )}

                {/* 6. Project Interview Preparation (Derived from Actual Resume Projects) */}
                {interviewPlan.project_preparation && interviewPlan.project_preparation.length > 0 && (
                  <div className="flex flex-col gap-3 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                      <Briefcase size={13} className="text-[#ff5722]" />
                      RESUME PROJECT INTERVIEW DEEP DIVE:
                    </div>
                    <div className="flex flex-col gap-3">
                      {interviewPlan.project_preparation.map((proj, pIdx) => (
                        <div key={pIdx} className="bg-[#121416] p-3 border border-[#2C3136] rounded-sm flex flex-col gap-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2C3136] pb-1.5">
                            <span className="font-bold text-white text-xs">{proj.project_name}</span>
                            <div className="flex flex-wrap gap-1">
                              {proj.tech_stack.map((t) => (
                                <span key={t} className="px-1.5 py-0.2 bg-[#1e2022] text-[#00C853] font-mono text-[9px] border border-[#2C3136] rounded-sm">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div>
                              <span className="text-[9px] font-label-caps text-[#ffb5a0] font-bold">ARCHITECTURE QUESTIONS:</span>
                              <ul className="flex flex-col gap-1 mt-0.5">
                                {proj.architecture_questions.map((q, qIdx) => (
                                  <li key={qIdx} className="text-[11px] text-[#e2e2e5] font-mono bg-[#181a1c] p-1.5 border border-[#2C3136]/50 rounded-sm">
                                    • {q}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <span className="text-[9px] font-label-caps text-[#ff9100] font-bold">CHALLENGE & TROUBLESHOOTING:</span>
                              <ul className="flex flex-col gap-1 mt-0.5">
                                {proj.challenge_questions.map((q, qIdx) => (
                                  <li key={qIdx} className="text-[11px] text-[#e2e2e5] font-mono bg-[#181a1c] p-1.5 border border-[#2C3136]/50 rounded-sm">
                                    • {q}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. Categorized Interview Question Bank */}
                {interviewPlan.interview_questions_by_category && (
                  <div className="flex flex-col gap-3 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                        <HelpCircle size={13} className="text-[#00C853]" />
                        TARGETED INTERVIEW QUESTION BANK:
                      </div>
                    </div>

                    {/* Category Filter Buttons */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-[#2C3136]">
                      {Object.keys(interviewPlan.interview_questions_by_category).map((catName) => {
                        const count = interviewPlan.interview_questions_by_category[catName]?.length || 0;
                        return (
                          <button
                            key={catName}
                            onClick={() => setActiveQuestionCategory(catName)}
                            className={`px-2.5 py-1 text-[10px] font-label-caps rounded-sm border transition-all whitespace-nowrap cursor-pointer ${
                              activeQuestionCategory === catName
                                ? 'bg-[#ff5722] text-white border-[#ff5722] font-bold'
                                : 'bg-[#121416] text-[#8e9196] border-[#2C3136] hover:text-white'
                            }`}
                          >
                            {catName} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Question Items for Active Category */}
                    <div className="flex flex-col gap-2 mt-1">
                      {(interviewPlan.interview_questions_by_category[activeQuestionCategory] || []).map((q, qIdx) => (
                        <div key={q.question_id || qIdx} className="bg-[#121416] p-2.5 border border-[#2C3136] rounded-sm flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] font-mono text-[#ff5722]">
                              {q.category || activeQuestionCategory}
                            </span>
                            {q.skill && (
                              <span className="text-[9px] font-mono text-[#8e9196] px-1 border border-[#2C3136] rounded-sm">
                                {q.skill}
                              </span>
                            )}
                          </div>
                          <span className="text-white text-xs font-bold leading-snug">
                            {q.question}
                          </span>
                          <p className="text-[10px] text-[#8e9196] italic">
                            Context: {q.context}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. Interactive Interview Readiness Checklist */}
                {interviewPlan.readiness_checklist && interviewPlan.readiness_checklist.length > 0 && (
                  <div className="flex flex-col gap-3 bg-[#16181a] border border-[#2C3136] p-3.5 rounded-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-[#2C3136] pb-2">
                      <div className="flex items-center gap-1.5 font-label-caps text-[10px] text-white font-bold tracking-wider">
                        <ListOrdered size={13} className="text-[#00C853]" />
                        INTERVIEW READINESS CHECKLIST:
                      </div>
                      <span className="text-[10px] font-mono text-[#00C853] font-bold">
                        {completedChecklistCount} / {totalChecklistCount} COMPLETED
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {interviewPlan.readiness_checklist.map((item) => {
                        const isDone = Boolean(checkedItems[item.item_id]);
                        return (
                          <div
                            key={item.item_id}
                            onClick={() => toggleCheckItem(item.item_id)}
                            className={`p-2.5 rounded-sm border cursor-pointer flex items-start gap-2.5 transition-all ${
                              isDone
                                ? 'bg-[#00C853]/10 border-[#00C853]/50'
                                : 'bg-[#121416] border-[#2C3136] hover:border-[#ff5722]'
                            }`}
                          >
                            <span className="mt-0.5 shrink-0 text-[#00C853]">
                              {isDone ? <CheckSquare size={14} /> : <Square size={14} className="text-[#8e9196]" />}
                            </span>
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className={`text-xs ${isDone ? 'line-through text-[#8e9196]' : 'text-white'}`}>
                                {item.label}
                              </span>
                              <span className="text-[9px] font-mono text-[#8e9196]">
                                Category: {item.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 flex flex-col items-center gap-3">
                <BookOpen size={36} className="text-[#ff5722]" />
                <div className="font-headline-md text-sm text-white">Systematic Interview Preparation Engine</div>
                <p className="text-xs text-[#8e9196] max-w-sm">
                  Generate a structured, skill-aware curriculum based on your detected resume skills and target Job Description.
                </p>
                <button
                  onClick={handleFetchInterviewPlan}
                  className="bg-[#ff5722] text-white px-4 py-2 text-xs font-label-caps font-bold glow-orange hover:bg-opacity-90 transition-all rounded-sm cursor-pointer mt-2"
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
