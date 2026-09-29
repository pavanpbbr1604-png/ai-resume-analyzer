import React from 'react';
import { X, Sliders, Sparkles, FileText, Mic, ShieldCheck, ArrowRight } from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (toolId: string) => void;
}

const TOOLS_LIST = [
  {
    id: 'rewriter',
    title: 'Gemini AI Full-Resume Generator',
    desc: 'Transforms your uploaded resume into a complete, executive-grade document applying Google X-Y-Z formula.',
    icon: Sparkles,
    badge: 'Flagship AI',
  },
  {
    id: 'assistant',
    title: 'Conversational Resume Assistant',
    desc: 'Context-aware AI partner that answers queries, refines individual bullets, and explains ATS suggestions.',
    icon: FileText,
    badge: 'Interactive',
  },
  {
    id: 'interview',
    title: 'AI Technical Interview Prep & STAR Coach',
    desc: 'Generates targeted behavioral and systems architecture questions with model answers based on your background.',
    icon: Mic,
    badge: 'Popular',
  },
  {
    id: 'ats-checker',
    title: 'Deterministic ATS Scorecard',
    desc: 'Transparent 100-point algorithm evaluating keyword density, formatting, active verbs, and structure.',
    icon: ShieldCheck,
    badge: 'Deterministic',
  },
];

export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose, onSelectTool }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <Sliders size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Career Intelligence Suite
              </h3>
              <p className="text-xs text-[#8e9196]">
                All executive resume, interview, and career tools in one place.
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

        {/* Tools Grid */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {TOOLS_LIST.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => {
                  onSelectTool(tool.id);
                  onClose();
                }}
                className="bg-[#131517] border border-[#282a2e] hover:border-[#ff5722]/60 p-4 rounded-xl cursor-pointer transition-all hover:bg-[#1b1e22] flex items-center justify-between group shadow-sm"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#ff5722]/10 border border-[#ff5722]/30 rounded-xl text-[#ff5722] shrink-0 group-hover:scale-105 transition-transform">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white group-hover:text-[#ff5722] transition-colors">
                        {tool.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-[#25282c] text-[#ffb5a0] border border-[#ff5722]/30">
                        {tool.badge}
                      </span>
                    </div>
                    <p className="text-xs text-[#8e9196] mt-1 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                </div>
                <div className="text-[#8e9196] group-hover:text-[#ff5722] group-hover:translate-x-1 transition-all pl-2 shrink-0">
                  <ArrowRight size={16} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
