import React from 'react';
import { Edit3, Mic, Sparkles, Layers } from 'lucide-react';

interface SidebarProps {
  activeView: 'optimizer' | 'assistant' | 'rewriter' | 'interview';
  onSelectView: (view: 'optimizer' | 'assistant' | 'rewriter' | 'interview') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onSelectView }) => {
  return (
    <aside className="sidebar-nav hidden md:flex flex-col h-full py-6 px-4 gap-6 border-r border-[#2C3136] bg-[#1a1c1e] shrink-0 z-20 relative overflow-y-auto">
      {/* Executive Profile Header */}
      <div className="mb-4 px-2">
        <h2 className="font-headline-md text-xl text-[#ffb5a0] font-bold">Executive Workspace</h2>
      </div>

      {/* Main Sidebar Navigation Menu */}
      <nav className="flex-1 flex flex-col gap-2">
        <button
          onClick={() => onSelectView('optimizer')}
          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
            activeView === 'optimizer'
              ? 'text-white bg-[#ff5722] font-bold shadow-md'
              : 'text-[#e4beb4] hover:bg-[#282a2c] hover:text-[#ff5722]'
          }`}
        >
          <Layers size={16} />
          <span>Resume Suggestions</span>
        </button>

        <button
          onClick={() => onSelectView('assistant')}
          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
            activeView === 'assistant'
              ? 'text-white bg-[#ff5722] font-bold shadow-md'
              : 'text-[#e4beb4] hover:bg-[#282a2c] hover:text-[#ff5722]'
          }`}
        >
          <Sparkles size={16} />
          <span>Resume Assistant</span>
        </button>

        <button
          onClick={() => onSelectView('rewriter')}
          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
            activeView === 'rewriter'
              ? 'text-white bg-[#ff5722] font-bold shadow-md'
              : 'text-[#e4beb4] hover:bg-[#282a2c] hover:text-[#ff5722]'
          }`}
        >
          <Edit3 size={16} />
          <span>Rewriter</span>
        </button>

        <button
          onClick={() => onSelectView('interview')}
          className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${
            activeView === 'interview'
              ? 'text-white bg-[#ff5722] font-bold shadow-md'
              : 'text-[#e4beb4] hover:bg-[#282a2c] hover:text-[#ff5722]'
          }`}
        >
          <Mic size={16} />
          <span>Interview Prep</span>
        </button>
      </nav>


      {/* Footer Go Premium */}
      <div className="mt-auto border-t border-[#2C3136] pt-4">
        <button
          onClick={() => alert('✨ Premium Tier Active: Unlimited AI Analyses, ONLYOFFICE Pro Editing, and Advanced Export Unlocked!')}
          className="w-full border border-[#ffb5a0] text-[#ffb5a0] px-4 py-2 font-label-caps text-xs hover:bg-[#ff5722] hover:text-white transition-colors rounded-sm font-bold shadow-sm"
        >
          Go Premium
        </button>
      </div>
    </aside>
  );
};
