import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Search,
  ExternalLink,
  MapPin,
  Sparkles,
  Trash2,
  Briefcase,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Job } from '../types/job';
import { ApplicationRecord } from '../types/application';
import { formatIstDateTime } from '../utils/temporalClient';

interface SavedJobsViewProps {
  jobs: Job[];
  applications: ApplicationRecord[];
  onSelectJob: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onTailorResume: (job: Job) => void;
  onNavigateDiscover: () => void;
}

export const SavedJobsView: React.FC<SavedJobsViewProps> = ({
  jobs,
  applications,
  onSelectJob,
  onToggleSave,
  onTailorResume,
  onNavigateDiscover,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const savedJobs = jobs.filter((j) => j.isSaved);

  const filteredSavedJobs = savedJobs.filter((j) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q) ||
      j.requiredSkills.some((s) => s.toLowerCase().includes(q))
    );
  });

  const getApplicationStatus = (jobId: string) => {
    const app = applications.find((a) => a.jobId === jobId);
    return app ? app.status : 'Not Applied';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Saved Jobs
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Bookmarked opportunities saved for review, tailoring, and application tracking
          </p>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {savedJobs.length} {savedJobs.length === 1 ? 'saved opportunity' : 'saved opportunities'}
        </div>
      </div>

      {savedJobs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Bookmark className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No saved jobs yet
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            Click the bookmark icon on any job in Discover to save it for later review and tailoring.
          </p>
          <button
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors"
          >
            <span>Browse Discover Jobs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Search within saved jobs */}
          {savedJobs.length > 5 && (
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved jobs by title, company, or skills..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
              />
            </div>
          )}

          {/* Compact Saved Jobs List */}
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
            {filteredSavedJobs.map((job) => {
              const score = job.matchResult?.overallScore || 0;
              const appStatus = getApplicationStatus(job.id);

              return (
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer gap-2"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSave(job.id);
                      }}
                      className="mt-0.5 p-1 rounded-md text-sky-600 dark:text-sky-400 hover:text-red-500 transition-colors shrink-0"
                      title="Remove from saved"
                      aria-label="Remove from saved"
                    >
                      <BookmarkCheck className="w-4 h-4 fill-current" />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">
                          {job.title}
                        </span>
                        <span className="text-xs text-slate-500">·</span>
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {job.company}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{job.location}</span>
                        </span>
                        <span>·</span>
                        <span>{job.workArrangement}</span>
                        <span>·</span>
                        <span className="text-[11px] font-mono">
                          Saved: {formatIstDateTime(job.lastChecked || job.firstSeenAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-7 sm:pl-0">
                    {/* Application Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        appStatus === 'Applied'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : appStatus === 'Interview'
                          ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : appStatus === 'Offer'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {appStatus}
                    </span>

                    {/* Match Score */}
                    <div
                      className={`px-2 py-0.5 rounded text-xs font-semibold font-mono tabular-nums ${
                        score >= 80
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                      }`}
                    >
                      {score}%
                    </div>

                    {/* Tailor Action */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTailorResume(job);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
                      title="Tailor resume for this job"
                    >
                      <Sparkles className="w-3 h-3 text-sky-500" />
                      <span>Tailor</span>
                    </button>

                    {/* External apply */}
                    <a
                      href={job.originalUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Open application URL"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
