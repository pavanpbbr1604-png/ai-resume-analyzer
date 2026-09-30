import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  FileText,
  FileCheck,
  CheckSquare,
  Video,
  Globe,
  ShoppingCart,
  Briefcase,
  Newspaper,
  Sliders,
  MessageSquare,
  Mail,
  User,
} from 'lucide-react';

export type SidebarItemKey =
  | 'dashboard'
  | 'resume'
  | 'cover-letter'
  | 'ats-checker'
  | 'grammar-checker'
  | 'interview'
  | 'website'
  | 'templates'
  | 'job-alert'
  | 'blog'
  | 'tools'
  | 'feedback';

interface SidebarProps {
  activeItem: string;
  onSelectItem: (item: SidebarItemKey) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeItem, onSelectItem }) => {
  const { user, openAuthModal, signOut } = useAuth();

  // Get user display name: prioritize full_name, email prefix, or default to "Pavan BR"
  const displayName =
    user?.user_metadata?.full_name ||
    (user?.email ? user.email.split('@')[0] : 'Pavan BR');

  const avatarUrl = user?.user_metadata?.avatar_url;

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { key: 'resume', label: 'Resume', icon: FileText },
    { key: 'cover-letter', label: 'Cover Letter', icon: Mail },
    { key: 'ats-checker', label: 'ATS Resume Checker', icon: FileCheck },
    { key: 'grammar-checker', label: 'Resume Grammar Checker', icon: CheckSquare },
    { key: 'interview', label: 'Interview Prep', icon: Video, badge: 'New' },
    { key: 'website', label: 'Website', icon: Globe },
    { key: 'templates', label: 'Templates', icon: ShoppingCart },
    { key: 'job-alert', label: 'Job Alert', icon: Briefcase },
    { key: 'blog', label: 'Blog', icon: Newspaper },
    { key: 'tools', label: 'Tools', icon: Sliders },
    { key: 'feedback', label: 'Feedback', icon: MessageSquare },
  ];

  return (
    <aside className="sidebar-nav hidden md:flex flex-col h-full w-64 lg:w-72 py-5 px-3 border-r border-[#2C3136] bg-[#16181a] shrink-0 z-20 relative select-none">
      {/* 1. USER PROFILE HEADER */}
      <div
        onClick={() => {
          if (!user) openAuthModal('Sign in to manage your executive profile & saved resumes');
        }}
        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#202327] transition-all cursor-pointer group mb-2"
        title={user ? `Signed in as ${user.email}` : 'Click to Sign In / Sign Up'}
      >
        {/* Circular Avatar */}
        <div className="relative w-11 h-11 rounded-full p-0.5 bg-gradient-to-tr from-[#383d44] to-[#ff5722]/50 shadow-md flex items-center justify-center shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-[#25282c] flex items-center justify-center text-[#ffb5a0] font-bold">
              <User size={20} className="text-[#e2e2e5]" />
            </div>
          )}
          {user && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#16181a] rounded-full" />
          )}
        </div>

        {/* User Name & Status */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-[#ff5722] transition-colors">
            {displayName}
          </h3>
          <p className="text-[11px] text-[#8e9196] font-medium truncate">
            {user ? 'Verified Member' : 'Free Workspace'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[1px] bg-[#282c32] my-2 mx-1" />

      {/* 2. VERTICAL NAVIGATION LIST */}
      <nav className="flex-1 flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onSelectItem(item.key as SidebarItemKey)}
              className={`relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer text-left ${
                isActive
                  ? 'bg-[#22252a] text-white shadow-sm border border-[#ff5722]/30 font-semibold'
                  : 'text-[#9ca3af] hover:text-[#ffb5a0] hover:bg-[#1c1e22] border border-transparent'
              }`}
            >
              {/* Left Accent Indicator Bar (Active State) */}
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-2 bg-[#ff5722] rounded-r-lg shadow-sm" />
              )}

              {/* Icon */}
              <Icon
                size={18}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? 'text-[#ff5722]'
                    : 'text-[#818790] group-hover:text-[#ff5722]'
                }`}
              />

              {/* Label */}
              <span className="flex-1 truncate">{item.label}</span>

              {/* Optional Badge (e.g. "New" on Interview Prep) */}
              {item.badge && (
                <span className="shrink-0 bg-[#ff3b30] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm uppercase tracking-wider animate-pulse">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info / Sign Out option if logged in */}
      {user && (
        <div className="pt-2 border-t border-[#282c32] mt-auto">
          <button
            onClick={() => signOut()}
            className="w-full text-left px-3 py-1.5 text-xs text-[#8e9196] hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            Sign Out ({user.email})
          </button>
        </div>
      )}
    </aside>
  );
};
