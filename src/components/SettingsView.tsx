import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Shield,
  Database,
  Download,
  Save,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  Building,
  Key,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import { CandidateProfile } from '../types/candidate';
import { api } from '../api/client';

interface SettingsViewProps {
  profile: CandidateProfile;
  onUpdateProfile: (updated: Partial<CandidateProfile>) => Promise<void>;
  onRefreshData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onUpdateProfile,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // New tag inputs
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  // Scheduler state
  const [scheduleTimeIst, setScheduleTimeIst] = useState('07:00');
  const [scheduleIntervalHours, setScheduleIntervalHours] = useState(24);
  const [catchUpEnabled, setCatchUpEnabled] = useState(true);
  const [autoDiscoveryEnabled, setAutoDiscoveryEnabled] = useState(true);
  const [schedulerConfig, setSchedulerConfig] = useState<any>(null);
  const [isDiscoveringNow, setIsDiscoveringNow] = useState(false);
  const [schedulerMsg, setSchedulerMsg] = useState<string | null>(null);

  useEffect(() => {
    setFormData(profile);
    api.getSchedulerConfig().then((cfg) => {
      setSchedulerConfig(cfg);
      setAutoDiscoveryEnabled(cfg.enabled ?? true);
      setScheduleTimeIst(cfg.scheduleTimeIst || '07:00');
      setScheduleIntervalHours(cfg.intervalHours || 24);
      setCatchUpEnabled(cfg.catchUpEnabled ?? true);
    }).catch(() => {});
  }, [profile]);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await onUpdateProfile({
        preferredRoles: formData.preferredRoles || [],
        preferredLocations: formData.preferredLocations || [],
        preferredArrangements: formData.preferredArrangements || [],
        preferredTypes: formData.preferredTypes || [],
        minExpectedSalary: formData.minExpectedSalary,
        maxExpectedSalary: formData.maxExpectedSalary,
        minExperienceYears: formData.minExperienceYears,
        maxExperienceYears: formData.maxExperienceYears,
        preferredIndustries: formData.preferredIndustries || [],
        workAuthorization: formData.workAuthorization || '',
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRole = () => {
    if (!newRole.trim()) return;
    const current = formData.preferredRoles || [];
    if (!current.includes(newRole.trim())) {
      setFormData({ ...formData, preferredRoles: [...current, newRole.trim()] });
    }
    setNewRole('');
  };

  const handleRemoveRole = (role: string) => {
    setFormData({
      ...formData,
      preferredRoles: (formData.preferredRoles || []).filter((r) => r !== role),
    });
  };

  const handleAddLocation = () => {
    if (!newLocation.trim()) return;
    const current = formData.preferredLocations || [];
    if (!current.includes(newLocation.trim())) {
      setFormData({ ...formData, preferredLocations: [...current, newLocation.trim()] });
    }
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    setFormData({
      ...formData,
      preferredLocations: (formData.preferredLocations || []).filter((l) => l !== loc),
    });
  };

  const handleAddIndustry = () => {
    if (!newIndustry.trim()) return;
    const current = formData.preferredIndustries || [];
    if (!current.includes(newIndustry.trim())) {
      setFormData({ ...formData, preferredIndustries: [...current, newIndustry.trim()] });
    }
    setNewIndustry('');
  };

  const handleRemoveIndustry = (ind: string) => {
    setFormData({
      ...formData,
      preferredIndustries: (formData.preferredIndustries || []).filter((i) => i !== ind),
    });
  };

  const toggleArrangement = (arr: 'Remote' | 'Hybrid' | 'On-site') => {
    const current = formData.preferredArrangements || [];
    const updated = current.includes(arr)
      ? current.filter((a) => a !== arr)
      : [...current, arr];
    setFormData({ ...formData, preferredArrangements: updated });
  };

  const toggleType = (type: 'Full-time' | 'Internship' | 'Part-time' | 'Contract') => {
    const current = formData.preferredTypes || [];
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    setFormData({ ...formData, preferredTypes: updated });
  };

  const handleUpdateSchedulerConfig = async () => {
    try {
      const res = await api.updateSchedulerConfig({
        enabled: autoDiscoveryEnabled,
        scheduleTimeIst,
        intervalHours: Number(scheduleIntervalHours),
        catchUpEnabled,
      });
      setSchedulerConfig(res.config);
      setSchedulerMsg('Discovery schedule configuration updated successfully.');
      setTimeout(() => setSchedulerMsg(null), 3500);
    } catch (err: any) {
      setSchedulerMsg(`Error: ${err?.message || 'Failed to update schedule'}`);
      setTimeout(() => setSchedulerMsg(null), 3500);
    }
  };

  const handleRunDiscoveryNow = async () => {
    setIsDiscoveringNow(true);
    try {
      const res = await api.runDiscoveryNow();
      setSchedulerMsg(`Discovery pass finished: +${res.run?.jobsAdded || 0} openings.`);
      setSchedulerConfig(res.config);
      await onRefreshData();
      setTimeout(() => setSchedulerMsg(null), 4000);
    } catch (err: any) {
      setSchedulerMsg(`Discovery failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsDiscoveringNow(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>JobPilot AI v1.0 Configuration</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              Settings &amp; Search Preferences
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Configure job recommendations, role priorities, salary thresholds, automatic discovery intervals, and data privacy options.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Preferences Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {saveError && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800 text-xs text-red-300 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* Section 1: Candidate Search Preferences */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Briefcase className="w-5 h-5 text-sky-400" />
            <h2>Job Search &amp; Recommendation Preferences</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Directly informs the 6D match engine when evaluating job fit and eligibility.
          </p>
        </div>

        {/* Target Roles */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Target Job Roles ({formData.preferredRoles?.length || 0})
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(formData.preferredRoles || []).map((role) => (
              <span
                key={role}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/30 text-xs font-medium"
              >
                <span>{role}</span>
                <button
                  onClick={() => handleRemoveRole(role)}
                  className="hover:text-white transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              placeholder="e.g. Python Developer, Full Stack Engineer..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1"
            />
            <button
              onClick={handleAddRole}
              className="px-3 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Add Role
            </button>
          </div>
        </div>

        {/* Preferred Locations */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Preferred Geographic Locations
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(formData.preferredLocations || []).map((loc) => (
              <span
                key={loc}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-medium"
              >
                <span>{loc}</span>
                <button
                  onClick={() => handleRemoveLocation(loc)}
                  className="hover:text-white transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
              placeholder="e.g. Hyderabad, Bengaluru, Remote India..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1"
            />
            <button
              onClick={handleAddLocation}
              className="px-3 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Add City
            </button>
          </div>
        </div>

        {/* Preferred Work Arrangement & Employment Types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Work Arrangements
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Remote', 'Hybrid', 'On-site'] as const).map((arr) => {
                const active = (formData.preferredArrangements || []).includes(arr);
                return (
                  <button
                    key={arr}
                    type="button"
                    onClick={() => toggleArrangement(arr)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      active
                        ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {arr}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Employment Types
            </label>
            <div className="flex flex-wrap gap-2">
              {(['Full-time', 'Internship', 'Part-time', 'Contract'] as const).map((t) => {
                const active = (formData.preferredTypes || []).includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      active
                        ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Experience Range & Salary Expectations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Min Experience (Years)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={formData.minExperienceYears ?? 0}
              onChange={(e) =>
                setFormData({ ...formData, minExperienceYears: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Max Experience (Years)</label>
            <input
              type="number"
              min={0}
              max={30}
              value={formData.maxExperienceYears ?? 2}
              onChange={(e) =>
                setFormData({ ...formData, maxExperienceYears: parseInt(e.target.value, 10) || 2 })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Min Expected Salary (Annual)</label>
            <input
              type="number"
              placeholder="e.g. 600000 (INR)"
              value={formData.minExpectedSalary || ''}
              onChange={(e) =>
                setFormData({ ...formData, minExpectedSalary: parseInt(e.target.value, 10) || undefined })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Work Authorization</label>
            <input
              type="text"
              placeholder="e.g. Authorized to work in India"
              value={formData.workAuthorization || ''}
              onChange={(e) => setFormData({ ...formData, workAuthorization: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Preferred Industries */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Preferred Industries &amp; Sectors
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(formData.preferredIndustries || []).map((ind) => (
              <span
                key={ind}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-xs font-medium"
              >
                <span>{ind}</span>
                <button
                  onClick={() => handleRemoveIndustry(ind)}
                  className="hover:text-white transition-colors"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIndustry()}
              placeholder="e.g. SaaS, FinTech, AI / ML, DevTools..."
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1"
            />
            <button
              onClick={handleAddIndustry}
              className="px-3 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Add Sector
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Daily Discovery Scheduler & Persistent Background Engine */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <Clock className="w-5 h-5 text-emerald-400" />
              <h2>Automated Daily Discovery Scheduler</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Configures continuous, server-side background job discovery across 32 company boards and 11 ATS platforms.
            </p>
          </div>

          <button
            onClick={handleRunDiscoveryNow}
            disabled={isDiscoveringNow}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-colors shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDiscoveringNow ? 'animate-spin' : ''}`} />
            <span>{isDiscoveringNow ? 'Running Discovery...' : 'Run Discovery Now'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">Background Scheduler</span>
                <span className="text-[11px] text-slate-400">Enables automated recurring discovery passes</span>
              </div>
              <input
                type="checkbox"
                checked={autoDiscoveryEnabled}
                onChange={(e) => setAutoDiscoveryEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Daily Execution Time (Asia/Kolkata / IST)
              </label>
              <input
                type="text"
                value={scheduleTimeIst}
                onChange={(e) => setScheduleTimeIst(e.target.value)}
                placeholder="07:00"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
              />
              <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                Format: HH:mm in 24-hour time. Default is 07:00 AM IST.
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Discovery Frequency</label>
              <select
                value={String(scheduleIntervalHours)}
                onChange={(e) => setScheduleIntervalHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="6">Every 6 Hours (Aggressive)</option>
                <option value="12">Every 12 Hours</option>
                <option value="24">Every 24 Hours (Recommended Daily Cycle)</option>
                <option value="48">Every 48 Hours</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">Startup Catch-Up Discovery</span>
                <span className="text-[11px] text-slate-400">Runs catch-up if last successful run is &gt; 24h old</span>
              </div>
              <input
                type="checkbox"
                checked={catchUpEnabled}
                onChange={(e) => setCatchUpEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-sky-600 focus:ring-0 bg-slate-800 border-slate-700 cursor-pointer"
              />
            </div>

            <button
              onClick={handleUpdateSchedulerConfig}
              className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors w-full sm:w-auto"
            >
              Save Scheduler Settings
            </button>

            {schedulerMsg && (
              <p className="text-xs text-emerald-400 font-mono">{schedulerMsg}</p>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-2 font-mono">
              <span className="font-semibold text-white block text-xs">Persistent Scheduler Status</span>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Status:</span>
                <span className={schedulerConfig?.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {schedulerConfig?.enabled ? 'Active (Auto-Running)' : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Target IST Time:</span>
                <span className="text-white">{schedulerConfig?.scheduleTimeIst || '07:00'} IST</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Next Scheduled Run:</span>
                <span className="text-sky-300">{schedulerConfig?.formattedNextRunIst || 'Tomorrow, 07:00 AM IST'}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Last Run At:</span>
                <span className="text-slate-300">{schedulerConfig?.formattedLastRunIst || 'Never'}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Concurrency Lock:</span>
                <span className="text-emerald-400">Prevent Overlapping Enabled</span>
              </div>
            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-2">
              <span className="font-semibold text-white block">Rate Limit &amp; Robots Protection</span>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                JobPilot adheres strictly to employer crawl terms, exponential backoff on HTTP 429 rate limits, and custom user-agent identification. Discovery cycles never spam company career endpoints.
              </p>
              <div className="pt-1 text-[10px] font-mono text-slate-500">
                User-Agent: JobPilotBot/1.0 (+https://github.com/jobpilot; open-source)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Security & Data Backup */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 space-y-5">
        <div className="border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-base">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2>Security, Privacy &amp; SQLite Backup</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Your personal data, applications, and resumes remain 100% on your local machine or private server.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-semibold text-white">SQLite Persistence</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active Database: <code className="text-sky-300">data/jobpilot.db</code>. Operating in WAL mode with Foreign Keys enforced.
            </p>
            <div className="pt-1 flex gap-2">
              <a
                href="/api/export?type=json"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Backup JSON</span>
              </a>
              <a
                href="/api/export?type=csv"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </a>
            </div>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">AI Provider Keys</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Optional Google Gemini API key is configured server-side via <code className="text-emerald-300">.env</code>. Keys are never transmitted to frontend clients.
            </p>
            <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Deterministic Fallback: Always Active
            </span>
          </div>

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-white">Zero Telemetry</span>
            </div>
            <p className="text-[11px] text-slate-400">
              JobPilot AI contains no third-party telemetry, tracking pixels, or external analytics by default. Your job hunt remains private.
            </p>
            <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Self-Host Ready: Single-Tenant
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

