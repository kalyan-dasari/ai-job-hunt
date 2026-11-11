import React, { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Clock,
  Database,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sun,
  Moon,
  Laptop,
  Check,
  ShieldCheck,
  Sliders,
  Play,
  RotateCw,
  ExternalLink,
  FolderDown,
} from 'lucide-react';
import { CandidateProfile } from '../types/candidate';
import { SchedulerState, CompanySource } from '../types/connector';
import { api } from '../api/client';
import { formatIstDateTime } from '../utils/temporalClient';

interface SettingsWorkspaceViewProps {
  profile: CandidateProfile;
  onUpdateProfile: (updated: Partial<CandidateProfile>) => Promise<void>;
  onRefreshData: () => Promise<void>;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

type SettingsTab =
  | 'profile'
  | 'preferences'
  | 'scheduler'
  | 'sources'
  | 'history'
  | 'theme'
  | 'backup';

export const SettingsWorkspaceView: React.FC<SettingsWorkspaceViewProps> = ({
  profile,
  onUpdateProfile,
  onRefreshData,
  theme,
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [profileForm, setProfileForm] = useState<CandidateProfile>(profile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Scheduler configuration state
  const [schedulerConfig, setSchedulerConfig] = useState<any>(null);
  const [scheduleTimeIst, setScheduleTimeIst] = useState('07:00');
  const [catchUpEnabled, setCatchUpEnabled] = useState(true);
  const [isUpdatingScheduler, setIsUpdatingScheduler] = useState(false);
  const [isRunningDiscoveryNow, setIsRunningDiscoveryNow] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState<string | null>(null);

  // Sources & History state
  const [companies, setCompanies] = useState<CompanySource[]>([]);
  const [ingestionRuns, setIngestionRuns] = useState<any[]>([]);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);

  useEffect(() => {
    setProfileForm(profile);
  }, [profile]);

  useEffect(() => {
    loadSchedulerAndSources();
  }, []);

  const loadSchedulerAndSources = async () => {
    try {
      const [sched, comps, runs] = await Promise.all([
        api.getSchedulerConfig().catch(() => null),
        api.getCompanies().catch(() => []),
        api.getIngestionRuns(20).catch(() => []),
      ]);

      if (sched) {
        setSchedulerConfig(sched);
        setScheduleTimeIst(sched.scheduleTimeIst || '07:00');
        setCatchUpEnabled(sched.catchUpEnabled ?? true);
      }
      setCompanies(comps);
      setIngestionRuns(runs);
    } catch (err) {
      console.error('Failed to load settings data:', err);
    }
  };

  // Save profile updates
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);
    try {
      await onUpdateProfile(profileForm);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Update scheduler settings
  const handleSaveScheduler = async () => {
    setIsUpdatingScheduler(true);
    setSchedulerMessage(null);
    try {
      const res = await api.updateSchedulerConfig({
        scheduleTimeIst,
        catchUpEnabled,
      });
      setSchedulerMessage('Discovery schedule saved successfully.');
      await loadSchedulerAndSources();
      setTimeout(() => setSchedulerMessage(null), 4000);
    } catch (err: any) {
      setSchedulerMessage(err.message || 'Failed to update schedule');
    } finally {
      setIsUpdatingScheduler(false);
    }
  };

  // Manual discovery run
  const handleRunDiscoveryNow = async () => {
    setIsRunningDiscoveryNow(true);
    setSchedulerMessage('Running discovery crawl across sources...');
    try {
      await api.runDiscoveryNow();
      setSchedulerMessage('Discovery completed successfully.');
      await onRefreshData();
      await loadSchedulerAndSources();
      setTimeout(() => setSchedulerMessage(null), 5000);
    } catch (err: any) {
      setSchedulerMessage(err.message || 'Discovery run failed');
    } finally {
      setIsRunningDiscoveryNow(false);
    }
  };

  // Toggle company enabled
  const handleToggleCompany = async (companyId: string, currentEnabled: boolean) => {
    try {
      await api.toggleCompanyEnabled(companyId, !currentEnabled);
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, isEnabled: !currentEnabled } : c))
      );
    } catch (err) {
      console.error('Failed to toggle company enabled state:', err);
    }
  };

  // Retry failed companies
  const handleRetryFailedCompanies = async () => {
    setIsLoadingSources(true);
    setSourceMessage('Retrying all failed company sources...');
    try {
      await api.retryFailedCompanies();
      setSourceMessage('Retry complete.');
      await onRefreshData();
      await loadSchedulerAndSources();
      setTimeout(() => setSourceMessage(null), 4000);
    } catch (err: any) {
      setSourceMessage(err.message || 'Retry failed');
    } finally {
      setIsLoadingSources(false);
    }
  };

  const navTabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'profile', label: 'Candidate Profile' },
    { id: 'preferences', label: 'Job Preferences' },
    { id: 'scheduler', label: 'Discovery Schedule' },
    { id: 'sources', label: 'Company Sources & ATS' },
    { id: 'history', label: 'Discovery History' },
    { id: 'theme', label: 'Theme & Appearance' },
    { id: 'backup', label: 'Data & Backup' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings & Configuration
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
          Configure your candidate preferences, background discovery scheduler, company sources, and theme
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 text-xs no-scrollbar">
        {navTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. Candidate Profile */}
      {activeTab === 'profile' && (
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-2xl shadow-2xs text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Personal Profile</h2>
            <p className="text-[11px] text-slate-500">
              Basic contact and title information used in matching and application preparation
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={profileForm.headline}
                onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Location
              </label>
              <input
                type="text"
                value={profileForm.location}
                onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                placeholder="Hyderabad / Bengaluru, India"
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Bio / Summary
              </label>
              <textarea
                rows={3}
                value={profileForm.summary}
                onChange={(e) => setProfileForm({ ...profileForm, summary: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-500">
              {profileSaveSuccess ? 'Changes saved to SQLite database!' : ''}
            </span>
            <button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs"
            >
              {profileSaveSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isSavingProfile ? 'Saving...' : 'Save Profile'}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Job Preferences */}
      {activeTab === 'preferences' && (
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-2xl shadow-2xs text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Target Roles & Preferences</h2>
            <p className="text-[11px] text-slate-500">
              Tailors match evaluation algorithms to your desired experience level and roles
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Preferred Roles (Comma separated)
              </label>
              <input
                type="text"
                value={profileForm.preferredRoles?.join(', ') || ''}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    preferredRoles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Software Engineer, Python Developer, AI Engineer, Full Stack"
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Preferred Locations (Comma separated)
              </label>
              <input
                type="text"
                value={profileForm.preferredLocations?.join(', ') || ''}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    preferredLocations: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="Hyderabad, Bengaluru, Pune, Remote India"
                className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Min Experience (Years)
                </label>
                <input
                  type="number"
                  value={profileForm.minExperienceYears || 0}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, minExperienceYears: Number(e.target.value) })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Max Experience (Years)
                </label>
                <input
                  type="number"
                  value={profileForm.maxExperienceYears || 2}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, maxExperienceYears: Number(e.target.value) })
                  }
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleSaveProfile}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {/* 3. Discovery Scheduler */}
      {activeTab === 'scheduler' && (
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-2xl shadow-2xs text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Automated Daily Background Scheduler
            </h2>
            <p className="text-[11px] text-slate-500">
              JobPilot crawls official ATS platforms automatically on the server without requiring an open browser
            </p>
          </div>

          {schedulerMessage && (
            <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg text-xs text-sky-800 dark:text-sky-300">
              {schedulerMessage}
            </div>
          )}

          {/* Status strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Scheduler Engine</div>
              <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Active (24h)</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Last Execution</div>
              <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                {formatIstDateTime(schedulerConfig?.lastRunAt)}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Next Scheduled Run</div>
              <div className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                {formatIstDateTime(schedulerConfig?.nextRunAt)}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Daily Run Time (Asia/Kolkata IST)
              </label>
              <input
                type="time"
                value={scheduleTimeIst}
                onChange={(e) => setScheduleTimeIst(e.target.value)}
                className="p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catchUpEnabled}
                onChange={(e) => setCatchUpEnabled(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-sky-600 focus:ring-sky-500"
              />
              <span className="text-slate-700 dark:text-slate-300">
                Run catch-up discovery immediately after server startup if last run was &gt;24 hours ago
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleRunDiscoveryNow}
              disabled={isRunningDiscoveryNow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${isRunningDiscoveryNow ? 'animate-spin' : ''}`} />
              <span>{isRunningDiscoveryNow ? 'Running Ingestion...' : 'Run Discovery Now'}</span>
            </button>

            <button
              onClick={handleSaveScheduler}
              disabled={isUpdatingScheduler}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isUpdatingScheduler ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* 4. Company Sources & ATS Health */}
      {activeTab === 'sources' && (
        <div className="space-y-3 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Company Sources & ATS Configuration ({companies.length})
              </h2>
              <p className="text-[11px] text-slate-500">
                Official career pages across Greenhouse, Lever, SmartRecruiters, Workable, Ashby, etc.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRetryFailedCompanies}
                disabled={isLoadingSources}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isLoadingSources ? 'animate-spin' : ''}`} />
                <span>Retry Failed Sources</span>
              </button>
            </div>
          </div>

          {sourceMessage && (
            <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg text-xs text-sky-800 dark:text-sky-300">
              {sourceMessage}
            </div>
          )}

          {/* Compact Sources Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Enabled</th>
                    <th className="py-2.5 px-3">Company</th>
                    <th className="py-2.5 px-3">ATS Provider</th>
                    <th className="py-2.5 px-3">HTTP Status</th>
                    <th className="py-2.5 px-3">Raw / New</th>
                    <th className="py-2.5 px-3">Last Checked</th>
                    <th className="py-2.5 px-3 text-right">URL</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {companies.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={Boolean(c.isEnabled)}
                          onChange={() => handleToggleCompany(c.id, Boolean(c.isEnabled))}
                          className="rounded border-slate-300 dark:border-slate-700 text-sky-600"
                        />
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                        {c.name}
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {c.atsProvider || 'Direct'}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            c.httpStatus === 200
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : c.httpStatus
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {c.httpStatus || 'Untested'}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {c.rawJobsCount || 0} raw · {c.newJobsCount || 0} new
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {formatIstDateTime(c.lastCrawlAt)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <a
                          href={c.careersUrl || c.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5 inline" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. Discovery History */}
      {activeTab === 'history' && (
        <div className="space-y-3 text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Discovery Ingestion Runs</h2>
            <p className="text-[11px] text-slate-500">
              Historical crawl logs, run durations, and count of opportunities evaluated
            </p>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Run ID</th>
                  <th className="py-2.5 px-3">Trigger</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Jobs Added</th>
                  <th className="py-2.5 px-3">Duplicates</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                {ingestionRuns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-[11px]">{r.id.slice(0, 16)}</td>
                    <td className="py-2.5 px-3">{r.triggerType}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {formatIstDateTime(r.startedAt)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      +{r.jobsAddedCount || 0}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">{r.duplicatesFilteredCount || 0}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. Theme & Appearance */}
      {activeTab === 'theme' && (
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-xl shadow-2xs text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Theme & Display</h2>
            <p className="text-[11px] text-slate-500">
              Customize the look and feel of the JobPilot workspace
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                if (theme !== 'light') onToggleTheme();
              }}
              className={`p-4 rounded-xl border text-left space-y-2 transition-colors ${
                theme === 'light'
                  ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <div className="font-semibold text-slate-900 dark:text-white">Light Mode</div>
              <div className="text-[11px] text-slate-500">Clean white and neutral backgrounds</div>
            </button>

            <button
              onClick={() => {
                if (theme !== 'dark') onToggleTheme();
              }}
              className={`p-4 rounded-xl border text-left space-y-2 transition-colors ${
                theme === 'dark'
                  ? 'bg-sky-950/40 border-sky-800 ring-2 ring-sky-500/20'
                  : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Moon className="w-5 h-5 text-sky-400" />
              <div className="font-semibold text-slate-900 dark:text-white">Dark Mode</div>
              <div className="text-[11px] text-slate-500">Subtle dark slate for low eye-strain</div>
            </button>
          </div>
        </div>
      )}

      {/* 7. Data & Backup */}
      {activeTab === 'backup' && (
        <div className="p-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 max-w-xl shadow-2xs text-xs">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data Export & Backup</h2>
            <p className="text-[11px] text-slate-500">
              Download your complete job hunt records, resumes, and tracked applications
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Full JSON Backup</div>
                <div className="text-[11px] text-slate-500">
                  Includes candidate profile, all 277 jobs, resume versions, and application history
                </div>
              </div>

              <a
                href="/api/export?type=json"
                download="jobpilot_backup.json"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </a>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">Applications CSV</div>
                <div className="text-[11px] text-slate-500">
                  Export tracked applications for spreadsheet analysis
                </div>
              </div>

              <a
                href="/api/export?type=csv"
                download="jobpilot_applications.csv"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
