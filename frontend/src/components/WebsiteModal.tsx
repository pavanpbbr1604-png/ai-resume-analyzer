import React, { useState } from 'react';
import { X, Globe, Copy, Check, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { NormalizedDocument } from '../types';

interface WebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: NormalizedDocument | null;
  candidateName?: string;
}

export const WebsiteModal: React.FC<WebsiteModalProps> = ({
  isOpen,
  onClose,
  document,
  candidateName = 'Pavan BR',
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const candidateBio =
    document?.sections?.find((s) => s.section_type === 'SUMMARY')?.paragraphs?.[0]?.full_text ||
    'High-performance Software Engineer specializing in scalable backend microservices, intelligent computer vision algorithms, and modern web architectures.';

  const handleCopyEmbed = () => {
    const embedCode = `<!-- Personal Website for ${candidateName} -->\n<iframe src="https://resume.ai/${encodeURIComponent(
      candidateName.toLowerCase().replace(/\s+/g, '-')
    )}" width="100%" height="800px" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <Globe size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                1-Click Personal Portfolio Website
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  Instant Host
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Turn your parsed resume into a modern, responsive personal website ready to share with recruiters.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#131517] border border-[#282a2e] rounded-lg p-0.5">
              <button
                onClick={() => setDeviceMode('desktop')}
                className={`p-1.5 rounded-md transition-colors ${
                  deviceMode === 'desktop' ? 'bg-[#ff5722] text-white' : 'text-[#8e9196] hover:text-white'
                }`}
                title="Desktop View"
              >
                <Monitor size={15} />
              </button>
              <button
                onClick={() => setDeviceMode('mobile')}
                className={`p-1.5 rounded-md transition-colors ${
                  deviceMode === 'mobile' ? 'bg-[#ff5722] text-white' : 'text-[#8e9196] hover:text-white'
                }`}
                title="Mobile View"
              >
                <Smartphone size={15} />
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-[#8e9196] hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Website Preview Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0f1012] flex items-center justify-center custom-scrollbar">
          <div
            className={`transition-all duration-300 bg-[#16181b] border border-[#282a2e] rounded-2xl shadow-xl overflow-hidden ${
              deviceMode === 'desktop' ? 'w-full' : 'w-[360px]'
            }`}
          >
            {/* Mock Browser Header */}
            <div className="bg-[#1e2024] px-4 py-2.5 border-b border-[#2C3136] flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              </div>
              <div className="bg-[#121416] text-[#8e9196] text-[11px] font-mono px-4 py-1 rounded-md border border-[#282a2e]">
                https://{candidateName.toLowerCase().replace(/\s+/g, '')}.dev
              </div>
              <div className="w-8" />
            </div>

            {/* Mock Website Body */}
            <div className="p-8 space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-[#282a2e]">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#ff5722] to-amber-400 p-0.5 shadow-lg">
                  <div className="w-full h-full rounded-full bg-[#131517] flex items-center justify-center text-2xl font-bold text-white">
                    {candidateName.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <h1 className="text-2xl font-bold text-white">{candidateName}</h1>
                  <p className="text-xs text-[#ff5722] font-semibold mt-0.5">
                    Software Engineer & Systems Builder
                  </p>
                  <p className="text-xs text-[#9ca3af] mt-2 max-w-xl leading-relaxed">
                    {candidateBio}
                  </p>
                </div>
              </div>

              {/* Skills Section */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Core Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {['Python', 'FastAPI', 'PyTorch', 'OpenCV / YOLOv8', 'React', 'TypeScript', 'Docker', 'PostgreSQL'].map(
                    (s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 text-xs rounded-lg bg-[#1f2227] text-[#e4beb4] border border-[#2e3238] font-mono font-medium"
                      >
                        {s}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Call to action */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#282a2e]">
                <span className="text-xs text-[#8e9196]">Open for Senior & Staff engineering roles</span>
                <button
                  onClick={() => alert(`Contact request sent for ${candidateName}!`)}
                  className="px-4 py-2 bg-[#ff5722] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#ff7043] transition-colors cursor-pointer"
                >
                  Contact Me
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-[#1f2226] border-t border-[#2C3136] flex items-center justify-between">
          <span className="text-xs text-[#8e9196] font-mono">
            Direct Shareable URL: https://{candidateName.toLowerCase().replace(/\s+/g, '')}.dev
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyEmbed}
              className="px-3.5 py-2 bg-[#16181b] hover:bg-[#25282c] text-[#e4beb4] hover:text-white text-xs font-bold rounded-xl border border-[#2C3136] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Copied Embed Code!' : 'Copy Embed Code'}
            </button>
            <button
              onClick={() => alert(`🎉 Portfolio website published! Live at https://${candidateName.toLowerCase().replace(/\s+/g, '')}.dev`)}
              className="px-4 py-2 bg-[#ff5722] hover:bg-[#ff7043] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <ExternalLink size={14} />
              Publish Live Website
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
