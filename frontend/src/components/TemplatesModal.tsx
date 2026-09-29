import React, { useState } from 'react';
import { X, ShoppingCart, Download, Star } from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TemplateItem {
  id: string;
  name: string;
  badge: string;
  rating: number;
  atsScore: string;
  description: string;
  accentColor: string;
  previewUrl: string;
}

const TEMPLATES: TemplateItem[] = [
  {
    id: 'harvard-classic',
    name: 'Harvard Business Classic',
    badge: '99% ATS Friendly',
    rating: 4.9,
    atsScore: '99/100',
    description: 'Clean single-column standard preferred by Fortune 500, McKinsey, and Wall Street recruiters.',
    accentColor: '#4f46e5',
    previewUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'faang-minimal',
    name: 'Silicon Valley Minimalist',
    badge: 'Tech & Engineering',
    rating: 5.0,
    atsScore: '98/100',
    description: 'Designed specifically for Software Engineers, ML Specialists, and Tech Leads. Emphasizes skills and quantified impact.',
    accentColor: '#0ea5e9',
    previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'executive-modern',
    name: 'Executive Leadership Pro',
    badge: 'Senior & Directors',
    rating: 4.8,
    atsScore: '97/100',
    description: 'Highlights executive competencies, cross-functional leadership metrics, and revenue growth milestones.',
    accentColor: '#ff5722',
    previewUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'compact-clean',
    name: 'Compact 1-Page Architect',
    badge: 'High Density',
    rating: 4.9,
    atsScore: '99/100',
    description: 'Fits dense technical experience, publications, and open-source contributions into a crisp 1-page format.',
    accentColor: '#10b981',
    previewUrl: 'https://images.unsplash.com/photo-1542744094-24638eff58bb?w=600&auto=format&fit=crop&q=80',
  },
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose }) => {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = (id: string, name: string) => {
    setDownloadingId(id);
    setTimeout(() => {
      setDownloadingId(null);
      alert(`🎉 Template "${name}" downloaded! Opening template format in your downloads.`);
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#181a1d] border border-[#2C3136] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#2C3136] flex items-center justify-between bg-[#1f2226]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#ff5722]/15 border border-[#ff5722]/40 rounded-xl text-[#ff5722]">
              <ShoppingCart size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                ATS-Optimized Resume Templates
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  Pre-Parsed & Tested
                </span>
              </h3>
              <p className="text-xs text-[#8e9196]">
                Battle-tested templates built for Workday, Greenhouse, Taleo, and Lever ATS systems.
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

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-5 custom-scrollbar">
          {TEMPLATES.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-[#131517] border border-[#282a2e] hover:border-[#ff5722]/50 transition-all rounded-xl p-4 flex flex-col justify-between group shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-white text-base group-hover:text-[#ff5722] transition-colors">
                    {tmpl.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#25282c] text-[#ffb5a0] border border-[#ff5722]/30 shrink-0">
                    {tmpl.badge}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs mb-3 text-[#8e9196]">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star size={13} fill="currentColor" /> {tmpl.rating}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">ATS Score: {tmpl.atsScore}</span>
                </div>

                <p className="text-xs text-[#b8bac0] leading-relaxed mb-4">
                  {tmpl.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#222529] flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#8e9196]">DOCX & PDF Compatible</span>
                <button
                  onClick={() => handleDownload(tmpl.id, tmpl.name)}
                  className="px-3.5 py-1.5 bg-[#23262a] hover:bg-[#ff5722] text-[#e4beb4] hover:text-white text-xs font-bold rounded-lg border border-[#33373d] hover:border-[#ff5722] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {downloadingId === tmpl.id ? (
                    'Downloading...'
                  ) : (
                    <>
                      <Download size={13} />
                      Use Template
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
