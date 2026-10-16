import React, { useState } from 'react';
import {
  Rocket,
  Search,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building,
  Users,
  Coins,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Job } from '../types/job';

interface StartupJobsViewProps {
  jobs: Job[];
  onSelectJob: (job: Job) => void;
  onPrepareApplication: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
}

export const StartupJobsView: React.FC<StartupJobsViewProps> = ({
  jobs,
  onSelectJob,
  onPrepareApplication,
  onToggleSave,
}) => {
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedArrangement, setSelectedArrangement] = useState('all');
  const [hasEquity, setHasEquity] = useState(false);
  const [paidOnly, setPaidOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter only startup jobs
  let startupJobs = jobs.filter((j) => j.isStartup && !j.isDismissed);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    startupJobs = startupJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.company.toLowerCase().includes(q) ||
        j.startupInfo?.industry.toLowerCase().includes(q) ||
        j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (selectedStage !== 'all') {
    startupJobs = startupJobs.filter((j) => j.startupInfo?.stage.toLowerCase() === selectedStage.toLowerCase());
  }

  if (selectedArrangement !== 'all') {
    startupJobs = startupJobs.filter((j) => j.workArrangement.toLowerCase() === selectedArrangement.toLowerCase());
  }

  if (hasEquity) {
    startupJobs = startupJobs.filter((j) => !!j.startupInfo?.equityOffered);
  }

  if (paidOnly) {
    startupJobs = startupJobs.filter((j) => j.employmentType !== 'Internship' || j.startupInfo?.paidInternship === true);
  }

  return (
    <div className="space-y-6">
      {/* Startup Hub Banner */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Rocket className="w-4 h-4" />
              <span>Startup Ecosystem & Early-Stage Discovery</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              High-Growth Startups & Founding Team Roles
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Discover verified opportunities across seed-stage, bootstrapped, and venture-backed startups with transparent equity and direct founder hiring channels.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400 shrink-0 bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
            <div>
              <div className="text-slate-500 text-[10px] uppercase">Active Startups</div>
              <div className="text-lg font-bold text-white tabular-nums">{startupJobs.length}</div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div>
              <div className="text-slate-500 text-[10px] uppercase">Founding Roles</div>
              <div className="text-lg font-bold text-indigo-400 tabular-nums">
                {startupJobs.filter((j) => j.startupInfo?.foundingTeamRole).length}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by startup name, tech stack, or industry..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Stages</option>
              <option value="pre-seed">Pre-seed</option>
              <option value="seed">Seed</option>
              <option value="series a">Series A</option>
              <option value="series b+">Series B+</option>
              <option value="bootstrapped">Bootstrapped</option>
            </select>
          </div>

          <div>
            <select
              value={selectedArrangement}
              onChange={(e) => setSelectedArrangement(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Arrangements</option>
              <option value="remote">Remote-first</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={hasEquity}
                onChange={(e) => setHasEquity(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0"
              />
              <span>Equity Disclosed</span>
            </label>
          </div>
        </div>
      </div>

      {/* Startup Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {startupJobs.map((job) => {
          const score = job.matchResult?.overallScore || 0;
          const info = job.startupInfo;

          return (
            <div
              key={job.id}
              className="bg-[#111726] border border-slate-800/80 hover:border-indigo-500/40 rounded-xl p-5 flex flex-col justify-between transition-all group"
            >
              <div className="space-y-3">
                {/* Header line */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="font-semibold text-white text-sm">{job.company}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-indigo-300 font-mono">{info?.stage || 'Seed'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{job.workArrangement}</span>
                    </div>

                    <h2
                      onClick={() => onSelectJob(job)}
                      className="text-base font-semibold text-white hover:text-indigo-400 cursor-pointer transition-colors mt-1"
                    >
                      {job.title}
                    </h2>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs text-slate-400">Match:</span>{' '}
                    <span className="text-sm font-bold font-mono text-indigo-400 tabular-nums">
                      {score}%
                    </span>
                  </div>
                </div>

                {/* Startup Metadata Details */}
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>Industry:</span>
                    </span>
                    <span className="text-slate-200">{info?.industry || 'Technology'}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Team Size:</span>
                    </span>
                    <span className="text-slate-200 font-mono">{info?.teamSize || '10-25 team'}</span>
                  </div>

                  {info?.equityOffered && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Coins className="w-3.5 h-3.5 text-amber-500" />
                        <span>Equity Pool:</span>
                      </span>
                      <span className="text-amber-400 font-mono font-medium">{info.equityOffered}</span>
                    </div>
                  )}

                  {job.salary?.displayText && (
                    <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                      <span>Compensation:</span>
                      <span className="text-emerald-400 font-mono">{job.salary.displayText}</span>
                    </div>
                  )}
                </div>

                {/* Description snippet */}
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Tech stack */}
                <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                  <span className="text-slate-500">Tech:</span>
                  {job.requiredSkills.slice(0, 4).map((tech, idx) => (
                    <span key={idx} className="text-slate-300">
                      {tech}
                      {idx < Math.min(3, job.requiredSkills.length - 1) ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Verified Entity</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectJob(job)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition-colors"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onPrepareApplication(job)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm"
                  >
                    Direct Apply
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
