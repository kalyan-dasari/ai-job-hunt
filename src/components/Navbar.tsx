import React from 'react';
import {
  Compass,
  Bell,
  Download,
  UploadCloud,
  Briefcase,
  Layers,
  FileText,
  Mail,
  ShieldCheck,
  Rocket,
  CheckCircle2,
} from 'lucide-react';
import jobpilotIcon from '../assets/images/jobpilot_app_icon_1792135299458.jpg';

export type NavTab =
  | 'dashboard'
  | 'discovery'
  | 'startups'
  | 'applications'
  | 'resume'
  | 'inbox'
  | 'sources';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenImport: () => void;
  onExport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isDemoMode,
  setIsDemoMode,
  unreadCount,
  onOpenNotifications,
  onOpenImport,
  onExport,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#0e131f]/95 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark & Mode Indicator */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900 shadow-sm flex items-center justify-center">
            <img
              src={jobpilotIcon}
              alt="JobPilot AI"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback icon if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <Compass className="w-4 h-4 text-sky-400 hidden only:block" />
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            JobPilot <span className="text-sky-400">AI</span>
          </span>

          {/* Clean mode toggle */}
          <div className="hidden sm:flex items-center ml-2 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setIsDemoMode(false)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                !isDemoMode ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Live Feed
            </button>
            <button
              onClick={() => setIsDemoMode(true)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                isDemoMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Demo Mode
            </button>
          </div>
        </div>

        {/* Zone 2: Navigation Links (single-line, clean text tabs) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('discovery')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'discovery'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Job Discovery
          </button>
          <button
            onClick={() => setActiveTab('startups')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'startups'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Startup Jobs
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'applications'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Tracker
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'resume'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Resume & Profile
          </button>
          <button
            onClick={() => setActiveTab('inbox')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'inbox'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Response Inbox
          </button>
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-3 py-1.5 text-xs xl:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'sources'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            Sources
          </button>
        </nav>

        {/* Zone 3: Primary Actions and Alerts */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenImport}
            title="Import Job Feed (CSV / JSON)"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
            <span>Ingest</span>
          </button>

          <button
            onClick={onExport}
            title="Export Candidate Data & Applications"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 hover:text-white transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export</span>
          </button>

          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-sky-500 text-[10px] font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile sub-navigation bar */}
      <div className="lg:hidden flex items-center overflow-x-auto px-4 py-2 bg-slate-950 border-t border-slate-800/60 gap-1 scrollbar-none text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'dashboard' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('discovery')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'discovery' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('startups')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'startups' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Startups
        </button>
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'applications' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Tracker
        </button>
        <button
          onClick={() => setActiveTab('resume')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'resume' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Resume
        </button>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'inbox' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Inbox
        </button>
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-2.5 py-1 rounded font-medium whitespace-nowrap ${
            activeTab === 'sources' ? 'bg-slate-800 text-white' : 'text-slate-400'
          }`}
        >
          Sources
        </button>
      </div>
    </header>
  );
};
