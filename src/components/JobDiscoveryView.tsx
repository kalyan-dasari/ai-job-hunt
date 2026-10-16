import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Building,
  MapPin,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import { Job, WorkArrangement, EmploymentType, ExperienceLevel, VerificationStatus } from '../types/job';

interface JobDiscoveryViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onPrepareApplication: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onToggleDismiss: (jobId: string) => void;
}

export const JobDiscoveryView: React.FC<JobDiscoveryViewProps> = ({
  jobs,
  onSelectJob,
  onPrepareApplication,
  onToggleSave,
  onToggleDismiss,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedArrangement, setSelectedArrangement] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedVerification, setSelectedVerification] = useState<string>('all');
  const [startupOnly, setStartupOnly] = useState(false);
  const [minScore, setMinScore] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'relevance' | 'score' | 'newest'>('relevance');

  // Filter pipeline
  let filtered = jobs.filter((j) => !j.isDismissed);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (selectedLocation !== 'all') {
    filtered = filtered.filter((j) => j.location.toLowerCase().includes(selectedLocation.toLowerCase()));
  }

  if (selectedArrangement !== 'all') {
    filtered = filtered.filter((j) => j.workArrangement.toLowerCase() === selectedArrangement.toLowerCase());
  }

  if (selectedType !== 'all') {
    filtered = filtered.filter((j) => j.employmentType.toLowerCase() === selectedType.toLowerCase());
  }

  if (selectedLevel !== 'all') {
    filtered = filtered.filter((j) => j.experienceLevel.toLowerCase() === selectedLevel.toLowerCase());
  }

  if (selectedSource !== 'all') {
    filtered = filtered.filter((j) => j.source.toLowerCase() === selectedSource.toLowerCase());
  }

  if (selectedVerification !== 'all') {
    filtered = filtered.filter(
      (j) => j.verificationReport.status.toLowerCase() === selectedVerification.toLowerCase()
    );
  }

  if (startupOnly) {
    filtered = filtered.filter((j) => j.isStartup);
  }

  if (minScore > 0) {
    filtered = filtered.filter((j) => (j.matchResult?.overallScore || 0) >= minScore);
  }

  // Sorting
  if (sortBy === 'score') {
    filtered.sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0));
  } else if (sortBy === 'newest') {
    filtered.sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
  } else {
    filtered.sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0));
  }

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLocation('all');
    setSelectedArrangement('all');
    setSelectedType('all');
    setSelectedLevel('all');
    setSelectedSource('all');
    setSelectedVerification('all');
    setStartupOnly(false);
    setMinScore(0);
    setSortBy('relevance');
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, skill (e.g. React, Python), or company..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Sort By:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="relevance">Highest Match</option>
              <option value="score">Match Score (Desc)</option>
              <option value="newest">Recently Posted</option>
            </select>
          </div>
        </div>

        {/* Filter Toolbar Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Arrangement</label>
            <select
              value={selectedArrangement}
              onChange={(e) => setSelectedArrangement(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Arrangements</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Employment</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="internship">Internship</option>
              <option value="part-time">Part-time</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Experience</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Experience Levels</option>
              <option value="intern">Intern</option>
              <option value="entry">Entry (0-2 yrs)</option>
              <option value="mid">Mid (2-5 yrs)</option>
              <option value="senior">Senior (5+ yrs)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Sources</option>
              <option value="career page">Career Pages</option>
              <option value="startup feed">Startup Feeds</option>
              <option value="linkedin">LinkedIn</option>
              <option value="naukri">Naukri</option>
              <option value="internshala">Internshala</option>
              <option value="foundit">Foundit</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Authenticity</label>
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified Only</option>
              <option value="needs review">Needs Review</option>
              <option value="high risk">High Risk Flagged</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Min Match</label>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value={0}>Any Score</option>
              <option value={70}>70%+ Match</option>
              <option value={80}>80%+ Match</option>
              <option value={90}>90%+ Match</option>
            </select>
          </div>
        </div>

        {/* Startup toggle & active counts row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={startupOnly}
                onChange={(e) => setStartupOnly(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0"
              />
              <span>Startup & Early-Stage Only</span>
            </label>

            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              Showing <strong className="text-white font-mono">{filtered.length}</strong> verified opportunities
            </span>
          </div>

          {(searchQuery ||
            selectedArrangement !== 'all' ||
            selectedType !== 'all' ||
            selectedLevel !== 'all' ||
            selectedSource !== 'all' ||
            selectedVerification !== 'all' ||
            startupOnly ||
            minScore > 0) && (
            <button
              onClick={resetFilters}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Jobs Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-white">No job opportunities matched your criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try adjusting your search terms, relaxing experience requirements, or clearing your active filters.
          </p>
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((job) => {
            const score = job.matchResult?.overallScore || 0;
            const isVerified = job.verificationReport.status === 'Verified';
            const isHighRisk = job.verificationReport.status === 'High Risk';

            return (
              <div
                key={job.id}
                className={`bg-[#111726] border rounded-xl p-5 transition-all group ${
                  isHighRisk
                    ? 'border-red-900/60 bg-red-950/10'
                    : 'border-slate-800/80 hover:border-slate-700/80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  {/* Left Column: Job Summary */}
                  <div className="space-y-2 flex-1">
                    {/* Unboxed Metadata Line with typographic separators */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-white text-sm">{job.company}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.location}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.workArrangement}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.employmentType}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-300 font-mono">{job.source}</span>
                      {job.isStartup && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-indigo-400 font-medium">Startup ({job.startupInfo?.stage || 'Seed'})</span>
                        </>
                      )}
                    </div>

                    {/* Job Title */}
                    <div className="flex items-baseline gap-2">
                      <h2
                        onClick={() => onSelectJob(job)}
                        className={`text-base font-semibold cursor-pointer transition-colors ${
                          isHighRisk ? 'text-red-300 hover:text-red-200' : 'text-white hover:text-sky-400'
                        }`}
                      >
                        {job.title}
                      </h2>
                      <a
                        href={job.originalUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        title="Open original listing URL in new tab"
                        className="text-slate-500 hover:text-slate-300 inline-flex items-center"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    {/* Salary & Experience Disclosures */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {job.salary?.displayText ? (
                        <span className="text-emerald-400 font-mono">{job.salary.displayText}</span>
                      ) : (
                        <span className="text-slate-500">Compensation undisclosed by source</span>
                      )}
                      <span aria-hidden="true" className="text-slate-700">·</span>
                      <span className="text-slate-400">
                        Experience: {job.experienceLevel} ({job.minExpYears || 0}-{job.maxExpYears || 0} yrs)
                      </span>
                    </div>

                    {/* Short Description */}
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Skills Checklist (Clean text tags) */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-1">
                      <span className="text-slate-500">Required Skills:</span>
                      {job.requiredSkills.map((skill, sIdx) => (
                        <span key={sIdx} className="text-slate-300">
                          {skill}
                          {sIdx < job.requiredSkills.length - 1 ? ' · ' : ''}
                        </span>
                      ))}
                    </div>

                    {/* Risk Callout if High Risk */}
                    {isHighRisk && (
                      <div className="mt-2 p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">Security Warning:</strong> {job.verificationReport.summary}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Match Score, Verification Badge & Actions */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-start gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {/* Match Score Display */}
                    <div className="text-left lg:text-right">
                      <div className="flex items-center gap-2 justify-start lg:justify-end">
                        <span className="text-xs text-slate-400">Match Fit:</span>
                        <span
                          className={`text-base font-bold font-mono tabular-nums ${
                            score >= 85 ? 'text-sky-400' : score >= 70 ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        >
                          {score}%
                        </span>
                      </div>

                      {/* Verification Status */}
                      <div className="mt-1 flex items-center gap-1.5 justify-start lg:justify-end text-xs">
                        {isVerified ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verified</span>
                          </span>
                        ) : isHighRisk ? (
                          <span className="text-red-400 flex items-center gap-1 font-medium">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>High Risk</span>
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Needs Review</span>
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px] font-mono">
                          ({job.verificationReport.confidence}% conf)
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Posted {job.datePosted}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onToggleSave(job.id)}
                        className={`p-2 rounded-lg border transition-colors ${
                          job.isSaved
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                        title={job.isSaved ? 'Remove from saved' : 'Save opportunity'}
                      >
                        {job.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => onSelectJob(job)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Inspect
                      </button>

                      {!isHighRisk ? (
                        <button
                          onClick={() => onPrepareApplication(job)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-sky-600/20"
                        >
                          Apply
                        </button>
                      ) : (
                        <button
                          onClick={() => onToggleDismiss(job.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-300 bg-red-950/50 hover:bg-red-900/60 border border-red-800/80 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Dismiss Risk
                        </button>
                      )}
                    </div>
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
