import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LogIn, ChevronDown, CheckCircle } from 'lucide-react';

export const UserProfileBadge: React.FC = () => {
  const { user, openAuthModal, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => openAuthModal('Sign in to access your saved resume analyses and history')}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#1e2022] hover:bg-[#ff5722]/20 border border-[#2C3136] hover:border-[#ff5722] text-[#e2e2e5] hover:text-white transition-all font-label-caps text-xs font-bold cursor-pointer"
        title="Sign in to save your resumes"
      >
        <LogIn size={13} className="text-[#ff5722]" />
        <span>SIGN IN</span>
      </button>
    );
  }

  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'Candidate';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1 rounded-sm bg-[#16181a] border border-[#2C3136] hover:border-[#ff5722]/60 transition-all cursor-pointer group"
      >
        {/* Avatar circle */}
        <div className="w-5 h-5 rounded-full bg-[#ff5722]/30 border border-[#ff5722] flex items-center justify-center text-[10px] font-bold text-white font-mono">
          {initial}
        </div>
        <span className="text-xs font-mono text-[#e2e2e5] group-hover:text-white max-w-[120px] truncate">
          {displayName}
        </span>
        <ChevronDown size={12} className="text-[#8e9196] group-hover:text-white transition-transform" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-56 bg-[#16181a] border border-[#2C3136] rounded-sm shadow-xl p-2.5 z-50 flex flex-col gap-2 animate-fade-in">
          {/* User info */}
          <div className="border-b border-[#2C3136] pb-2 px-1">
            <div className="flex items-center gap-1.5">
              <span className="font-label-caps text-[10px] text-[#ff5722] font-bold">
                ACCOUNT ACTIVE
              </span>
              <CheckCircle size={11} className="text-[#00C853]" />
            </div>
            <p className="text-xs font-mono text-white font-semibold truncate mt-0.5">
              {displayName}
            </p>
            <p className="text-[10px] font-mono text-[#8e9196] truncate">
              {user.email}
            </p>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={async () => {
              setDropdownOpen(false);
              await signOut();
            }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-[#ff5252]/10 text-[#8e9196] hover:text-[#ff5252] transition-colors text-xs font-label-caps font-bold cursor-pointer text-left"
          >
            <LogOut size={13} />
            <span>SIGN OUT</span>
          </button>
        </div>
      )}
    </div>
  );
};
