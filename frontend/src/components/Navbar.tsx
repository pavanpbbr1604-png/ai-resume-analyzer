import React from 'react';
import { Menu } from 'lucide-react';

interface NavbarProps {
  onUploadClick?: () => void;
  onBackToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onBackToHome }) => {
  return (
    <nav className="docked full-width top-0 border-b border-[#2C3136] flex justify-between items-center px-6 py-4 w-full bg-[#121416] relative z-10">
      <div className="flex items-center gap-6">
        {onBackToHome && (
          <button
            onClick={onBackToHome}
            className="text-xs font-label-caps text-[#ff5722] hover:underline flex items-center gap-1 border border-[#ff5722]/40 px-2.5 py-1 rounded-sm bg-[#ff5722]/10 font-bold cursor-pointer"
            title="Return to Mainframe Landing Page"
          >
            ← Mainframe®
          </button>
        )}
      </div>

      {/* Center Logo: LUMIER ✳︎ */}
      <div
        onClick={onBackToHome}
        className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2 cursor-pointer group"
        title="LUMIER AI Workspace"
      >
        <span
          className="text-2xl font-bold tracking-tighter text-[#e2e2e5] group-hover:text-[#ff5722] transition-colors"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          LUMIER
        </span>
        <span className="text-2xl text-[#ff5722] select-none">✳︎</span>
      </div>

      <div className="flex items-center gap-6">
        <span className="font-label-caps text-xs text-[#e4beb4] hidden sm:inline-block">
          System Status: <span className="text-[#00C853] font-bold">Active</span>
        </span>
        <button
          onClick={() => alert('📱 Mobile menu toggled')}
          title="Toggle Menu"
          className="flex items-center justify-center w-8 h-8 rounded-full border border-[#2C3136] text-[#e4beb4] hover:text-[#ff5722] hover:border-[#ff5722] transition-colors cursor-pointer md:hidden bg-transparent"
        >
          <Menu size={16} />
        </button>
      </div>
    </nav>
  );
};
