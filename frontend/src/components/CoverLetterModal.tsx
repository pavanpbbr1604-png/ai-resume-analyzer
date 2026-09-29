import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, Download, Mail, Loader2, Target, Building } from 'lucide-react';
import { api } from '../services/api';

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId?: string;
  defaultJdText?: string;
}

export const CoverLetterModal: React.FC<CoverLetterModalProps> = ({
  isOpen,
  onClose,
  resumeId,
  defaultJdText = '',
}) => {
  const [roleTitle, setRoleTitle] = useState('Senior Software Engineer');
  const [companyName, setCompanyName] = useState('Tech Innovators Inc.');
  const [jdText, setJdText] = useState(defaultJdText);
  const [coverLetter, setCoverLetter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!resumeId) {
      setError('Please upload or analyze a resume first to generate a tailored cover letter.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const letter = await api.generateCoverLetter(resumeId, jdText, roleTitle, companyName);
      setCoverLetter(letter);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate cover letter.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!coverLetter) return;
    navigator.clipboard.writeText(coverLetter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!coverLetter) return;
    const blob = new Blob([coverLetter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `Cover_Letter_${companyName.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <Mail size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                AI Cover Letter Architect
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#ff5722]/20 text-[#ff5722] border border-[#ff5722]/40">
                  Gemini Powered
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Generate a tailored, high-converting cover letter based on your authentic resume experience.
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#e4beb4] mb-1.5 flex items-center gap-1.5">
                <Target size={14} className="text-[#ff5722]" /> Target Role / Job Title
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Senior Machine Learning Engineer"
                className="w-full bg-[#121416] border border-[#2C3136] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff5722] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#e4beb4] mb-1.5 flex items-center gap-1.5">
                <Building size={14} className="text-[#ff5722]" /> Target Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Stripe, Google, or Stealth Startup"
                className="w-full bg-[#121416] border border-[#2C3136] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#ff5722] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#e4beb4] mb-1.5">
              Job Description Context (Optional)
            </label>
            <textarea
              rows={3}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste job description keywords or requirements to tailor specific bullet points..."
              className="w-full bg-[#121416] border border-[#2C3136] rounded-xl p-3 text-xs font-mono text-[#e2e2e5] focus:border-[#ff5722] outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleGenerate}
              disabled={isLoading || !resumeId}
              className="px-5 py-2.5 bg-[#ff5722] hover:bg-[#ff7043] text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating with Gemini...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Custom Cover Letter
                </>
              )}
            </button>
          </div>

          {/* Generated Letter Output */}
          {coverLetter && (
            <div className="mt-4 border border-[#2C3136] bg-[#121416] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-[#2C3136]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Generated Cover Letter
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-[#1e2024] hover:bg-[#282a2e] text-[#e4beb4] hover:text-white text-xs font-semibold rounded-lg border border-[#2C3136] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-3 py-1.5 bg-[#1e2024] hover:bg-[#282a2e] text-[#e4beb4] hover:text-white text-xs font-semibold rounded-lg border border-[#2C3136] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>

              <div className="text-sm text-[#e2e2e5] whitespace-pre-wrap leading-relaxed font-sans bg-[#16181a] p-4 rounded-lg border border-[#282a2e] max-h-72 overflow-y-auto custom-scrollbar">
                {coverLetter}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
