import React from 'react';
import {
  Compass,
  Bookmark,
  Layers,
  FileText,
  Settings,
  Bell,
  Sun,
  Moon,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import jobpilotIcon from '../assets/images/jobpilot_app_icon_1792135299458.jpg';
import { CandidateProfile } from '../types/candidate';

export type MainNavTab = 'discover' | 'saved' | 'applications' | 'resume' | 'settings';

interface AppSidebarProps {
  activeTab: MainNavTab;
  onSelectTab: (tab: MainNavTab) => void;
  savedCount: number;
  applicationsCount: number;
  unreadNotificationsCount: number;
  onOpenNotifications: () => void;
  candidate: CandidateProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  totalJobsCount: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  applicationsCount,
  unreadNotificationsCount,
  onOpenNotifications,
  candidate,
  theme,
  onToggleTheme,
  totalJobsCount,
}) => {
  const navItems: Array<{
    id: MainNavTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'discover', label: 'Discover', icon: Compass },
    { id: 'saved', label: 'Saved Jobs', icon: Bookmark, badge: savedCount },
    { id: 'applications', label: 'Applications', icon: Layers, badge: applicationsCount },
    { id: 'resume', label: 'My Resume', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-slate-50/80 dark:bg-[#0c101a] border-r border-slate-200 dark:border-slate-800/80 select-none">
        {/* Brand / Workspace Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
              <img
                src={jobpilotIcon}
                alt="JobPilot"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <Compass className="w-4 h-4 text-sky-400 hidden only:block" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                JobPilot <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-normal">v1.1</span>
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono"
            title="Discovery System Operational"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live</span>
          </div>
        </div>

        {/* Primary Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded-md ${
                      isActive
                        ? 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Panel: Candidate Profile & Utilities */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
          {/* Candidate Card */}
          <button
            onClick={() => onSelectTab('resume')}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-left transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              {candidate.name ? candidate.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">
                {candidate.name || 'Candidate'}
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {candidate.headline || 'Resume Profile'}
              </div>
            </div>
          </button>

          {/* Controls: Notifications & Theme */}
          <div className="flex items-center justify-between px-2 pt-1 text-slate-600 dark:text-slate-400">
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 rounded-md hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>

            <button
              onClick={onToggleTheme}
              className="p-1.5 rounded-md hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md overflow-hidden bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center shrink-0">
            <img
              src={jobpilotIcon}
              alt="JobPilot"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Compass className="w-3.5 h-3.5 text-sky-400 hidden only:block" />
          </div>
          <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            JobPilot <span className="text-sky-600 dark:text-sky-400">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sky-500" />
            )}
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0c101a]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 h-14 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-sky-600 dark:text-sky-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[9px] font-mono bg-sky-500 text-white rounded-full leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-1">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
