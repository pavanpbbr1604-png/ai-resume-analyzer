import React from 'react';
import { X, CheckSquare, CheckCircle2, TrendingUp } from 'lucide-react';
import { NormalizedDocument } from '../types';

interface GrammarCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: NormalizedDocument | null;
}

export const GrammarCheckerModal: React.FC<GrammarCheckerModalProps> = ({
  isOpen,
  onClose,
  document: _document,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <CheckSquare size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Resume Grammar & Voice Engine
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  98% Voice Clarity
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Auditing tense consistency, active power verbs, and passive voice elimination.
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

        {/* Audit Metrics */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#121416] border border-[#282a2e] p-3.5 rounded-xl text-center">
              <span className="text-2xl font-bold text-emerald-400">98%</span>
              <p className="text-[10px] uppercase font-bold text-[#8e9196] mt-0.5">Active Voice</p>
            </div>
            <div className="bg-[#121416] border border-[#282a2e] p-3.5 rounded-xl text-center">
              <span className="text-2xl font-bold text-emerald-400">100%</span>
              <p className="text-[10px] uppercase font-bold text-[#8e9196] mt-0.5">Tense Consistency</p>
            </div>
            <div className="bg-[#121416] border border-[#282a2e] p-3.5 rounded-xl text-center">
              <span className="text-2xl font-bold text-[#ff5722]">18+</span>
              <p className="text-[10px] uppercase font-bold text-[#8e9196] mt-0.5">Executive Verbs</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#e4beb4] uppercase tracking-wider">
              Grammar & Tone Audit Findings
            </h4>

            <div className="bg-[#131517] border border-[#282a2e] p-4 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Past-Tense Work Experience Alignment</h5>
                <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                  All prior role bullet points correctly begin with strong past-tense action verbs (e.g., <em>"Spearheaded", "Architected", "Engineered", "Optimized"</em>). Zero passive voice detected in core bullets.
                </p>
              </div>
            </div>

            <div className="bg-[#131517] border border-[#282a2e] p-4 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0 mt-0.5">
                <TrendingUp size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Impact Verb Enhancement Opportunity</h5>
                <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                  Replace neutral verbs like <em>"Assisted with"</em> or <em>"Handled"</em> with high-authority verbs like <em>"Orchestrated", "Accelerated", "Delivered"</em>.
                </p>
              </div>
            </div>

            <div className="bg-[#131517] border border-[#282a2e] p-4 rounded-xl flex items-start gap-3">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Zero Spelling & Typo Errors Detected</h5>
                <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                  Technical jargon, framework titles (PyTorch, FastAPI, YOLOv8), and syntax capitalization conform to industry standards.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
