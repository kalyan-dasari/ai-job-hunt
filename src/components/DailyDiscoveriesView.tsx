import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Building2,
  ExternalLink,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Bookmark,
  EyeOff,
  GraduationCap,
  Wifi,
  ChevronRight,
  Tag,
  Radio,
} from 'lucide-react';
import { Job, FresherStatus } from '../types/job';
import { DailyDiscoveriesResponse, DailyJobStats, SchedulerState } from '../types/connector';
import { CandidateProfile } from '../types/candidate';
import { api } from '../api/client';

interface DailyDiscoveriesViewProps {
  profile: CandidateProfile;
  onSelectJob: (job: Job) => void;
  onPrepareApplication: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onToggleDismiss: (jobId: string) => void;
}

export const DailyDiscoveriesView: React.FC<DailyDiscoveriesViewProps> = ({
  profile,
  onSelectJob,
  onPrepareApplication,
  onToggleSave,
  onToggleDismiss,
}) => {
  const [data, setData] = useState<DailyDiscoveriesResponse | null>(null);
  const [timeframe, setTimeframe] = useState<'today' | '24h' | '7d' | '30d'>('today');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expFilter, setExpFilter] = useState('all');
  const [locFilter, setLocFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Open');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningDiscovery, setIsRunningDiscovery] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadFeed = async (tf: 'today' | '24h' | '7d' | '30d' = timeframe) => {
    setIsLoading(true);
    try {
      const res = await api.getDailyDiscoveries({
        timeframe: tf,
        role: roleFilter,
        experience: expFilter,
        location: locFilter,
        status: statusFilter,
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load daily discoveries feed:', err);
      setActionMessage(`Error loading feed: ${err?.message || 'Server error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeed(timeframe);
  }, [timeframe, roleFilter, expFilter, locFilter, statusFilter]);

  const handleRunNow = async () => {
    setIsRunningDiscovery(true);
    setActionMessage(null);
    try {
      const res = await api.runDiscoveryNow();
      setActionMessage(
        `Discovery completed: +${res.run?.jobsAdded || 0} new openings found across ${res.run?.sourcesChecked?.length || 0} sources.`
      );
      await loadFeed();
    } catch (err: any) {
      setActionMessage(`Discovery failed: ${err?.message || 'Server error'}`);
    } finally {
      setIsRunningDiscovery(false);
    }
  };

  // Filter jobs by in-page search query
  const displayedJobs = (data?.jobs || []).filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const stats = data?.stats || {
    newlyDiscoveredToday: 0,
    newlyPostedLast24h: 0,
    newOpeningsLast7d: 0,
    recentlyUpdated: 0,
    fresherJobs: 0,
    internships: 0,
    remoteIndia: 0,
    byRole: {},
    byLocation: {},
  };

  const scheduler = data?.scheduler;

  return (
    <div className="space-y-6">
      {/* Top Banner & Automated Scheduler Status */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Continuous Daily Discovery
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                <Clock className="w-3.5 h-3.5" />
                07:00 AM IST Daily
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Daily Job Discoveries &amp; New Openings Feed
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Every day at 7:00 AM IST, JobPilot crawls 32 active company career boards and 11 ATS adapters. Discover fresh vacancies the moment they are published, with deterministic deduplication and strict ₹0 operating cost.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl text-xs space-y-1 font-mono">
              <div className="text-slate-400 flex items-center justify-between gap-4">
                <span>Scheduler:</span>
                <span className={scheduler?.enabled ? 'text-emerald-400' : 'text-slate-500'}>
                  {scheduler?.enabled ? 'Active (Auto)' : 'Paused'}
                </span>
              </div>
              <div className="text-slate-400 flex items-center justify-between gap-4">
                <span>Next Run:</span>
                <span className="text-white">
                  {(scheduler as any)?.formattedNextRunIst || 'Tomorrow, 07:00 AM IST'}
                </span>
              </div>
            </div>

            <button
              onClick={handleRunNow}
              disabled={isRunningDiscovery}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRunningDiscovery ? 'animate-spin' : ''}`} />
              <span>{isRunningDiscovery ? 'Discovering Live...' : 'Run Discovery Now'}</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div className="mt-4 p-3 bg-slate-900/90 border border-sky-500/30 rounded-xl text-xs text-sky-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>{actionMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards: Daily Freshness & Relevance */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Discovered Today</span>
          <div className="text-2xl font-bold text-sky-400">{stats.newlyDiscoveredToday}</div>
          <span className="text-[10px] text-slate-500 font-mono">Asia/Kolkata Calendar</span>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Posted Last 24h</span>
          <div className="text-2xl font-bold text-emerald-400">{stats.newlyPostedLast24h}</div>
          <span className="text-[10px] text-slate-500 font-mono">Employer Timestamp</span>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Openings Last 7d</span>
          <div className="text-2xl font-bold text-indigo-400">{stats.newOpeningsLast7d}</div>
          <span className="text-[10px] text-slate-500 font-mono">Rolling 7-Day Window</span>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Recently Updated</span>
          <div className="text-2xl font-bold text-amber-400">{stats.recentlyUpdated}</div>
          <span className="text-[10px] text-slate-500 font-mono">Refreshed Details</span>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Fresher-Friendly</span>
          <div className="text-2xl font-bold text-purple-400">{stats.fresherJobs}</div>
          <span className="text-[10px] text-slate-500 font-mono">0–2 Years / Graduate</span>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4 space-y-1">
          <span className="text-[11px] font-medium text-slate-400 block">Remote in India</span>
          <div className="text-2xl font-bold text-teal-400">{stats.remoteIndia}</div>
          <span className="text-[10px] text-slate-500 font-mono">Work From Anywhere</span>
        </div>
      </div>

      {/* Control Bar: Timeframe & Filters */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-4 space-y-4">
        {/* Timeframe Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframe === 'today'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Today (IST)
            </button>
            <button
              onClick={() => setTimeframe('24h')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframe === '24h'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 24 Hours
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframe === '7d'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeframe === '30d'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Last 30 Days
            </button>
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, company, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Filter Chips: Experience, Role, Location, Status */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Experience Select */}
          <select
            value={expFilter}
            onChange={(e) => setExpFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Experience Levels</option>
            <option value="fresher">Fresher (0–2 Years)</option>
            <option value="internship">Internships &amp; Trainees</option>
            <option value="experienced">Experienced (3+ Years)</option>
          </select>

          {/* Role Select */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Roles</option>
            <option value="python">Python Developer</option>
            <option value="backend">Backend Developer</option>
            <option value="full stack">Full Stack Developer</option>
            <option value="react">React / Frontend</option>
            <option value="ai">AI / ML Engineer</option>
            <option value="analyst">Data Analyst</option>
          </select>

          {/* Location Select */}
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Locations</option>
            <option value="bengaluru">Bengaluru</option>
            <option value="hyderabad">Hyderabad</option>
            <option value="chennai">Chennai</option>
            <option value="pune">Pune</option>
            <option value="remote_india">Remote (India)</option>
          </select>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="Open">Active Openings Only</option>
            <option value="all">All Listings (incl. Closed)</option>
            <option value="Closed">Closed / Filled Listings</option>
          </select>

          <span className="text-slate-500 ml-auto font-mono text-[11px]">
            Showing {displayedJobs.length} listings
          </span>
        </div>
      </div>

      {/* Feed Listings */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading daily openings feed...</p>
        </div>
      ) : displayedJobs.length === 0 ? (
        <div className="py-20 text-center bg-[#111726] border border-slate-800/80 rounded-2xl p-8 space-y-3">
          <Briefcase className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-semibold text-white">No openings match your current filter</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try switching to "Last 7 Days" or "Last 30 Days" timeframe, or trigger a manual discovery run using the button above.
          </p>
          <button
            onClick={() => {
              setTimeframe('7d');
              setRoleFilter('all');
              setExpFilter('all');
              setLocFilter('all');
              setStatusFilter('Open');
              setSearchQuery('');
            }}
            className="px-4 py-2 text-xs font-medium text-sky-400 bg-sky-950/40 border border-sky-800/50 rounded-xl hover:bg-sky-900/40 transition-colors"
          >
            Reset Filters to 7-Day Feed
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedJobs.map((job) => {
            const isClosed = job.jobStatus === 'Closed' || job.freshnessStatus === 'Closed';
            const isFresher = job.fresherStatus === 'Fresher';
            const isExperienced = job.fresherStatus === 'Experienced';

            return (
              <div
                key={job.id}
                className={`bg-[#111726] border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700/90 ${
                  isClosed ? 'border-rose-950/40 opacity-70' : 'border-slate-800/80'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header: Badges & Status */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Discovery Badge */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono">
                      <Sparkles className="w-3 h-3" />
                      Discovered {job.firstSeenAt ? new Date(job.firstSeenAt).toLocaleDateString('en-GB') : 'Recent'}
                    </span>

                    {/* Posting Date Badge - Honest & Transparent */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-900 text-slate-300 border border-slate-800 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {job.postedAt
                        ? `Posted ${new Date(job.postedAt).toLocaleDateString('en-GB')}`
                        : 'Posting date unavailable'}
                    </span>

                    {/* Updated badge */}
                    {job.isUpdated && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                        Updated
                      </span>
                    )}

                    {/* Experience Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium font-mono ${
                        isFresher
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                          : isExperienced
                          ? 'bg-slate-800 text-slate-300 border border-slate-700'
                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <GraduationCap className="w-3 h-3" />
                      {isFresher ? 'Fresher-Friendly' : isExperienced ? 'Experienced' : 'Unspecified Exp'}
                    </span>

                    {/* Closure status */}
                    {isClosed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono ml-auto">
                        Closed / Filled
                      </span>
                    )}
                  </div>

                  {/* Title & Company */}
                  <div>
                    <h3 className="text-base font-bold text-white hover:text-sky-400 transition-colors line-clamp-1">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{job.company}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {job.location}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-slate-500" />
                        {job.workArrangement}
                      </span>
                    </div>
                  </div>

                  {/* Snippet / Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {job.description || 'No job description provided by source.'}
                  </p>

                  {/* Skills Pills */}
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.requiredSkills.slice(0, 4).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono"
                        >
                          {s}
                        </span>
                      ))}
                      {job.requiredSkills.length > 4 && (
                        <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-mono">
                          +{job.requiredSkills.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer: Match Score & Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {job.matchResult && (
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                            job.matchResult.overallScore >= 75
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : job.matchResult.overallScore >= 50
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {Math.round(job.matchResult.overallScore)}
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">Match</span>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      Via {job.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onToggleSave(job.id)}
                      title={job.isSaved ? 'Unsave Job' : 'Save Job'}
                      className={`p-2 rounded-lg border transition-colors ${
                        job.isSaved
                          ? 'bg-sky-950/60 border-sky-600 text-sky-400'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectJob(job)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                    >
                      Details
                    </button>

                    <a
                      href={job.applicationUrl || job.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                    >
                      <span>Apply</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
