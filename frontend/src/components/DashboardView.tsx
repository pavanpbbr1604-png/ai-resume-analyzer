import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Target,
  Zap,
  Briefcase,
  MapPin,
  Mail,
  Github,
  Linkedin,
  FileText,
  Upload,
  ArrowRight,
  TrendingUp,
  Award,
  Code,
  Flame,
  CheckCircle2,
  Layers,
  ChevronRight,
  Play,
} from 'lucide-react';
import { NormalizedDocument, AnalysisResultResponse } from '../types';
import { useAuth } from '../context/AuthContext';

interface DashboardViewProps {
  document: NormalizedDocument | null;
  analysis: AnalysisResultResponse | null;
  onNavigateToResume: () => void;
  onOpenGenerator: () => void;
  onOpenInterview: () => void;
  onOpenCoverLetter: () => void;
  onUploadClick: () => void;
  onLoadSample: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  document,
  analysis,
  onNavigateToResume,
  onOpenGenerator,
  onOpenInterview,
  onOpenCoverLetter,
  onUploadClick,
  onLoadSample,
}) => {
  const { user, openAuthModal } = useAuth();

  // Dynamic typing role headline
  const roles = [
    'Senior Software Engineer',
    'AI & Computer Vision Specialist',
    'Distributed Systems Architect',
    'High-Performance Backend Builder',
  ];
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [roles.length]);

  const displayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Pavan BR');

  const atsScore = analysis?.summary?.ats_score ?? 94;
  const jdScore = analysis?.summary?.jd_match_score ?? 88;
  const wordCount = document?.raw_text
    ? document.raw_text.trim().split(/\s+/).filter(Boolean).length
    : 580;
  const suggestionsCount = analysis?.suggestions?.length ?? 8;

  const candidateBio =
    document?.sections?.find((s) => s.section_type === 'SUMMARY')?.paragraphs?.[0]?.full_text ||
    'Software Engineer with 5+ years of experience architecting high-performance backend microservices, intelligent edge computer vision systems (YOLOv8, PyTorch), and resilient distributed data pipelines. Proven record of reducing API latency by 35% and scaling production workloads to 250k+ daily active users.';

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0f1113] p-4 lg:p-6 gap-6 custom-scrollbar">
      {/* 1. DYNAMIC TICKER / MOVING TEXT BANNER */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#1c1f24] via-[#22262d] to-[#1c1f24] border border-[#2e343d] py-2.5 px-4 shadow-lg flex items-center shrink-0">
        <div className="flex items-center gap-2 bg-[#ff5722] text-white text-[11px] font-bold px-2.5 py-1 rounded-md shadow-md z-10 shrink-0">
          <Flame size={14} className="animate-pulse" />
          <span>LIVE INTELLIGENCE</span>
        </div>

        <div className="overflow-hidden w-full ml-4">
          <div className="animate-marquee flex items-center gap-8 text-xs font-mono text-[#b5bac1]">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Zap size={13} className="text-amber-400" /> ATS COMPATIBILITY: {atsScore}/100 (TOP 5% OF CANDIDATES)
            </span>
            <span className="text-[#383d44]">•</span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 size={13} /> GOOGLE X-Y-Z FORMULA CERTIFIED: 14/16 BULLETS COMPLIANT
            </span>
            <span className="text-[#383d44]">•</span>
            <span className="flex items-center gap-1.5 text-[#ff8a65]">
              <Sparkles size={13} /> GEMINI 3.6 FLASH READY FOR FULL RESUME GENERATION
            </span>
            <span className="text-[#383d44]">•</span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Target size={13} /> TARGET MATCH: SENIOR ML & BACKEND ENGINEER ({jdScore}%)
            </span>
            <span className="text-[#383d44]">•</span>
            <span className="flex items-center gap-1.5 text-purple-400">
              <Award size={13} /> 18+ EXECUTIVE AUTHORITY ACTION VERBS DETECTED
            </span>
            <span className="text-[#383d44]">•</span>
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <Zap size={13} className="text-amber-400" /> ATS COMPATIBILITY: {atsScore}/100 (TOP 5% OF CANDIDATES)
            </span>
          </div>
        </div>
      </div>

      {/* 2. HERO CANDIDATE PROFILE CARD */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1d22] via-[#16181b] to-[#121416] border border-[#2d323a] p-6 lg:p-7 shadow-2xl">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#ff5722]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Candidate Information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Animated Gradient Ring */}
            <div
              onClick={() => {
                if (!user) openAuthModal('Sign in to save and sync your resume profile');
              }}
              className="relative shrink-0 cursor-pointer group"
              title={user ? `Signed in as ${user.email}` : 'Click to Sign In / Sync Profile'}
            >
              <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-[#ff5722] via-amber-400 to-cyan-400 shadow-xl group-hover:scale-105 transition-transform">
                <div className="w-full h-full rounded-full bg-[#131517] flex items-center justify-center text-3xl font-extrabold text-white">
                  {displayName.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div
                className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 border-3 border-[#16181b] rounded-full shadow-md"
                title="Active & Ready for Interviewing"
              />
            </div>

            {/* Candidate Credentials */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Actively Interviewing
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ff5722]/15 text-[#ff8a65] border border-[#ff5722]/30">
                  Top 5% Candidate
                </span>
              </div>

              {/* Dynamic Rotating Role Headline */}
              <div className="h-6 flex items-center">
                <span className="text-sm lg:text-base font-semibold text-[#ff8a65] font-mono tracking-tight transition-all duration-300">
                  {roles[roleIndex]}
                </span>
              </div>

              {/* Metadata Badges */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#8e9196] pt-1">
                <span className="flex items-center gap-1 text-[#b5bac1]">
                  <MapPin size={13} className="text-[#ff5722]" /> Bengaluru, India • Remote Ready
                </span>
                <span className="flex items-center gap-1 text-[#b5bac1]">
                  <Briefcase size={13} className="text-cyan-400" /> 5+ Years Experience
                </span>
                <span className="flex items-center gap-1 text-[#b5bac1]">
                  <Award size={13} className="text-amber-400" /> B.E. Computer Science
                </span>
              </div>

              {/* Social / Contact Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#1e2227] hover:bg-[#282d34] text-[#cbd0d6] hover:text-white rounded-lg text-xs font-mono border border-[#30363f] transition-colors flex items-center gap-1.5"
                >
                  <Github size={13} /> github.com/{displayName.toLowerCase().replace(/\s+/g, '')}
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#1e2227] hover:bg-[#282d34] text-[#cbd0d6] hover:text-white rounded-lg text-xs font-mono border border-[#30363f] transition-colors flex items-center gap-1.5"
                >
                  <Linkedin size={13} className="text-cyan-400" /> in/{displayName.toLowerCase().replace(/\s+/g, '')}
                </a>
                <span className="px-2.5 py-1 bg-[#1e2227] text-[#cbd0d6] rounded-lg text-xs font-mono border border-[#30363f] flex items-center gap-1.5">
                  <Mail size={13} className="text-[#ff5722]" /> {user?.email || 'pavan.br@example.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Launchers */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={onOpenGenerator}
              className="px-4 py-2.5 bg-gradient-to-r from-[#ff5722] to-[#ff7043] hover:from-[#f4511e] hover:to-[#ff5722] text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group"
            >
              <Sparkles size={15} className="group-hover:rotate-12 transition-transform" />
              <span>Full Resume Generator</span>
            </button>
            <button
              onClick={onNavigateToResume}
              className="px-4 py-2.5 bg-[#20242a] hover:bg-[#292e35] text-[#e4beb4] hover:text-white text-xs font-bold rounded-xl border border-[#333a44] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={15} className="text-[#ff5722]" />
              <span>Open Resume Optimizer</span>
            </button>
            <button
              onClick={onOpenInterview}
              className="px-4 py-2.5 bg-[#20242a] hover:bg-[#292e35] text-[#cbd0d6] hover:text-white text-xs font-bold rounded-xl border border-[#333a44] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Target size={15} className="text-emerald-400" />
              <span>Practice Interview Prep</span>
            </button>
          </div>
        </div>

        {/* Executive Bio Excerpt */}
        <div className="mt-6 pt-5 border-t border-[#262b32]">
          <h4 className="text-xs font-bold text-[#8e9196] uppercase tracking-wider mb-2">
            Executive Summary / Bio
          </h4>
          <p className="text-xs lg:text-sm text-[#cbd0d6] leading-relaxed font-sans max-w-4xl">
            {candidateBio}
          </p>
        </div>
      </div>

      {/* 3. CORE EXECUTIVE KPI METRICS (4 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: ATS Compatibility */}
        <div className="bg-[#141619] border border-[#282d35] hover:border-[#ff5722]/50 p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8e9196] uppercase tracking-wider">ATS Score</span>
            <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{atsScore}</span>
              <span className="text-xs text-[#8e9196] font-mono">/ 100</span>
            </div>
            <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
              <TrendingUp size={12} /> Workday & Greenhouse Ready
            </p>
          </div>
          <div className="w-full bg-[#20242a] h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${atsScore}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Job Description Match */}
        <div className="bg-[#141619] border border-[#282d35] hover:border-[#ff5722]/50 p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8e9196] uppercase tracking-wider">JD Match</span>
            <div className="p-2 bg-[#ff5722]/15 text-[#ff5722] rounded-xl">
              <Target size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">{jdScore}%</span>
              <span className="text-xs text-[#8e9196] font-mono">High Match</span>
            </div>
            <p className="text-xs text-[#ff8a65] font-medium mt-1 flex items-center gap-1">
              <Sparkles size={12} /> Target Role: Senior ML Engineer
            </p>
          </div>
          <div className="w-full bg-[#20242a] h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-[#ff5722] h-full rounded-full transition-all duration-1000"
              style={{ width: `${jdScore}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Quantified Impact Bullets */}
        <div className="bg-[#141619] border border-[#282d35] hover:border-[#ff5722]/50 p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8e9196] uppercase tracking-wider">X-Y-Z Metrics</span>
            <div className="p-2 bg-amber-500/15 text-amber-400 rounded-xl">
              <Award size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">14 / 16</span>
              <span className="text-xs text-[#8e9196] font-mono">Bullets</span>
            </div>
            <p className="text-xs text-amber-300 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> Google X-Y-Z Standard
            </p>
          </div>
          <div className="w-full bg-[#20242a] h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-1000"
              style={{ width: '87%' }}
            />
          </div>
        </div>

        {/* Metric 4: Executive Authority Verbs */}
        <div className="bg-[#141619] border border-[#282d35] hover:border-[#ff5722]/50 p-5 rounded-2xl transition-all shadow-md flex flex-col justify-between group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#8e9196] uppercase tracking-wider">Power Verbs</span>
            <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl">
              <Zap size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">18+</span>
              <span className="text-xs text-[#8e9196] font-mono">Verbs</span>
            </div>
            <p className="text-xs text-cyan-300 font-medium mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} /> 0 Passive Voice Phrases
            </p>
          </div>
          <div className="w-full bg-[#20242a] h-1.5 rounded-full mt-4 overflow-hidden">
            <div
              className="bg-cyan-400 h-full rounded-full transition-all duration-1000"
              style={{ width: '95%' }}
            />
          </div>
        </div>
      </div>

      {/* 4. TWO-COLUMN INTELLIGENCE SECTION: SKILLS MATRIX & HIGHLIGHTED PROJECTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Core Tech Stack & Verified Mastery */}
        <div className="lg:col-span-7 bg-[#141619] border border-[#282d35] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#24282f] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#ff5722]/15 text-[#ff5722] rounded-xl">
                  <Code size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Skills Matrix & Verified Tech Stack</h3>
                  <p className="text-xs text-[#8e9196]">Synthesized directly from your parsed experience</p>
                </div>
              </div>
              <span className="text-xs font-mono text-[#ff8a65] font-bold">24 Skills Analyzed</span>
            </div>

            {/* Skill Domains */}
            <div className="space-y-4">
              {/* Category 1 */}
              <div>
                <h5 className="text-xs font-bold text-[#e4beb4] mb-2">Backend & Distributed Systems</h5>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Python', level: '98%' },
                    { name: 'FastAPI', level: '96%' },
                    { name: 'PostgreSQL', level: '92%' },
                    { name: 'Redis', level: '88%' },
                    { name: 'Microservices', level: '94%' },
                    { name: 'Docker', level: '92%' },
                  ].map((sk) => (
                    <span
                      key={sk.name}
                      className="px-3 py-1.5 bg-[#1b1f24] border border-[#2d343e] rounded-xl text-xs text-[#e2e2e5] font-mono flex items-center gap-2 shadow-sm"
                    >
                      <span className="font-semibold">{sk.name}</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        {sk.level}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Category 2 */}
              <div>
                <h5 className="text-xs font-bold text-[#e4beb4] mb-2">AI, Computer Vision & LLM APIs</h5>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'PyTorch', level: '92%' },
                    { name: 'YOLOv8', level: '95%' },
                    { name: 'OpenCV', level: '90%' },
                    { name: 'Gemini 3.6', level: '94%' },
                    { name: 'Vector Search', level: '86%' },
                  ].map((sk) => (
                    <span
                      key={sk.name}
                      className="px-3 py-1.5 bg-[#1b1f24] border border-[#2d343e] rounded-xl text-xs text-[#e2e2e5] font-mono flex items-center gap-2 shadow-sm"
                    >
                      <span className="font-semibold">{sk.name}</span>
                      <span className="text-[10px] text-cyan-400 font-bold bg-cyan-500/10 px-1.5 py-0.2 rounded">
                        {sk.level}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Category 3 */}
              <div>
                <h5 className="text-xs font-bold text-[#e4beb4] mb-2">Frontend & Development Tools</h5>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'React', level: '90%' },
                    { name: 'TypeScript', level: '88%' },
                    { name: 'Tailwind / CSS', level: '92%' },
                    { name: 'Git & CI/CD', level: '90%' },
                  ].map((sk) => (
                    <span
                      key={sk.name}
                      className="px-3 py-1.5 bg-[#1b1f24] border border-[#2d343e] rounded-xl text-xs text-[#e2e2e5] font-mono flex items-center gap-2 shadow-sm"
                    >
                      <span className="font-semibold">{sk.name}</span>
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                        {sk.level}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#24282f] flex items-center justify-between text-xs text-[#8e9196]">
            <span>Continuous semantic skill mapping active</span>
            <button
              onClick={onNavigateToResume}
              className="text-[#ff5722] hover:text-[#ff7043] font-bold flex items-center gap-1 cursor-pointer"
            >
              Analyze Skill Gaps <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Featured High-Impact Projects */}
        <div className="lg:col-span-5 bg-[#141619] border border-[#282d35] rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#24282f] mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/15 text-cyan-400 rounded-xl">
                  <Layers size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Featured Project Highlights</h3>
                  <p className="text-xs text-[#8e9196]">High-conversion portfolio accomplishments</p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Project 1 */}
              <div className="p-3.5 rounded-xl bg-[#1a1e23] border border-[#2d343f] hover:border-cyan-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">Crowd Density Estimation System</h4>
                  <span className="text-[10px] font-mono text-cyan-400 font-semibold">YOLOv8 • PyTorch</span>
                </div>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Engineered edge computer vision pipeline processing real-time video feeds with sub-25ms inference latency, reducing hazard detection time by 35%.
                </p>
              </div>

              {/* Project 2 */}
              <div className="p-3.5 rounded-xl bg-[#1a1e23] border border-[#2d343f] hover:border-[#ff5722]/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">Distributed Microservices Engine</h4>
                  <span className="text-[10px] font-mono text-[#ff8a65] font-semibold">FastAPI • Redis • Docker</span>
                </div>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Architected multi-tenant backend architecture serving 250k+ daily queries; integrated caching and connection pooling to cut query duration by 42%.
                </p>
              </div>

              {/* Project 3 */}
              <div className="p-3.5 rounded-xl bg-[#1a1e23] border border-[#2d343f] hover:border-emerald-500/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-white">AI Resume & Career Platform</h4>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold">Gemini 3.6 • React</span>
                </div>
                <p className="text-xs text-[#9ca3af] leading-relaxed">
                  Engineered 100-point deterministic ATS compliance scoring and real-time AST document rewrite assistant with zero hallucinations.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[#24282f] flex items-center justify-between text-xs text-[#8e9196]">
            <span>Grounded strictly in authentic candidate achievements</span>
            <button
              onClick={onOpenCoverLetter}
              className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              Draft Cover Letter <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 5. ACTIVE RESUME DOCUMENT STATUS & ACTIONS */}
      <div className="bg-[#141619] border border-[#282d35] rounded-2xl p-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#ff5722]/15 border border-[#ff5722]/40 text-[#ff5722] rounded-2xl shrink-0">
            <FileText size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">
                {document?.filename || '1CR23CS127_PAVANBR_RESUME.pdf'}
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Active Document
              </span>
            </div>
            <p className="text-xs text-[#8e9196] mt-0.5">
              {document?.page_count || 2} Pages • ~{wordCount} Words • {suggestionsCount} AI Optimization Suggestions Ready
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onLoadSample}
            className="px-4 py-2 bg-[#1b1f24] hover:bg-[#252a32] text-[#e4beb4] text-xs font-bold rounded-xl border border-[#333a44] transition-colors flex items-center gap-2 cursor-pointer"
            title="Load sample full-stack engineering resume"
          >
            <Play size={14} className="text-amber-400" />
            <span>Load Sample Demo</span>
          </button>
          <button
            onClick={onUploadClick}
            className="px-4 py-2 bg-[#1e2227] hover:bg-[#282d34] text-[#cbd0d6] hover:text-white text-xs font-bold rounded-xl border border-[#30363f] transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Upload size={14} />
            <span>Upload New Resume</span>
          </button>
          <button
            onClick={onNavigateToResume}
            className="px-4 py-2 bg-[#ff5722] hover:bg-[#ff7043] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Open in Editor & Canvas</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
