import React, { useState } from 'react';
import { X, Briefcase, Check, ExternalLink, MapPin, DollarSign } from 'lucide-react';

interface JobAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateSkills?: string[];
}

interface RecommendedJob {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string;
  matchScore: number;
  tags: string[];
}

const SAMPLE_JOBS: RecommendedJob[] = [
  {
    id: 'j-1',
    role: 'Senior Machine Learning & Backend Engineer',
    company: 'Anthropic AI',
    location: 'San Francisco, CA (Remote Friendly)',
    salary: '$180,000 - $240,000',
    matchScore: 94,
    tags: ['Python', 'PyTorch', 'FastAPI', 'YOLO / Vision', 'Docker'],
  },
  {
    id: 'j-2',
    role: 'Staff Python Infrastructure Engineer',
    company: 'Databricks',
    location: 'Remote (US & Global)',
    salary: '$195,000 - $265,000',
    matchScore: 91,
    tags: ['Python', 'Distributed Systems', 'PostgreSQL', 'Microservices'],
  },
  {
    id: 'j-3',
    role: 'Full Stack AI Product Engineer',
    company: 'Scale AI',
    location: 'New York, NY / Remote',
    salary: '$165,000 - $215,000',
    matchScore: 88,
    tags: ['React', 'TypeScript', 'FastAPI', 'Gemini / LLM APIs'],
  },
];

export const JobAlertModal: React.FC<JobAlertModalProps> = ({
  isOpen,
  onClose,
  candidateSkills = ['Python', 'FastAPI', 'PyTorch', 'React'],
}) => {
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly' | 'instant'>('daily');
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSaveAlerts = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <Briefcase size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI Job Match & Alerts
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Live Match Engine
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Targeted opportunities matched automatically against your skills: {candidateSkills.slice(0, 4).join(', ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8e9196] hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {/* Top Alert Settings Banner */}
          <div className="bg-[#131517] border border-[#282a2e] p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="email-alerts"
                checked={emailAlertsEnabled}
                onChange={(e) => setEmailAlertsEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#ff5722] cursor-pointer"
              />
              <label htmlFor="email-alerts" className="cursor-pointer">
                <h4 className="text-xs font-bold text-white">Daily Curated Role Alerts</h4>
                <p className="text-[11px] text-[#8e9196]">
                  Receive high-compatibility opportunities (&gt;85% match) right in your inbox.
                </p>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={alertFrequency}
                onChange={(e) => setAlertFrequency(e.target.value as any)}
                className="bg-[#1a1c1e] text-xs text-white border border-[#2C3136] rounded-lg px-2.5 py-1.5 outline-none"
              >
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Rollup</option>
                <option value="instant">Instant Match</option>
              </select>
              <button
                onClick={handleSaveAlerts}
                className="px-3.5 py-1.5 bg-[#ff5722] hover:bg-[#ff7043] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? <Check size={13} /> : null}
                {savedSuccess ? 'Saved!' : 'Save Preference'}
              </button>
            </div>
          </div>

          {/* Recommended Jobs List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#e4beb4] uppercase tracking-wider">
              Top Matched Roles for Your Profile
            </h4>
            {SAMPLE_JOBS.map((job) => (
              <div
                key={job.id}
                className="bg-[#131517] border border-[#282a2e] hover:border-[#ff5722]/50 p-4 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-bold text-white text-sm group-hover:text-[#ff5722] transition-colors">
                      {job.role}
                    </h5>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {job.matchScore}% Match
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#8e9196] mb-2">
                    <span className="text-white font-medium">{job.company}</span>
                    <span className="flex items-center gap-1">
                      <MapPin size={12} /> {job.location}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <DollarSign size={12} /> {job.salary}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1e2024] text-[#b8bac0] border border-[#282a2e]"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-center gap-2">
                  <button
                    onClick={() => alert(`Redirecting to application portal for ${job.role} at ${job.company}`)}
                    className="w-full px-3.5 py-1.5 bg-[#23262a] hover:bg-[#ff5722] text-[#e4beb4] hover:text-white text-xs font-bold rounded-lg border border-[#33373d] hover:border-[#ff5722] transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Apply</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
