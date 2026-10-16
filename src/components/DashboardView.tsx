import React from 'react';
import {
  Briefcase,
  Sparkles,
  Bookmark,
  Send,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Rocket,
  CheckCircle2,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { Job } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { ApplicationRecord } from '../types/application';
import avatarImg from '../assets/images/avatar_candidate_1792135315638.jpg';

interface DashboardViewProps {
  candidate: CandidateProfile;
  jobs: Job[];
  applications: ApplicationRecord[];
  isDemoMode: boolean;
  onNavigateTab: (tab: string) => void;
  onSelectJob: (job: Job) => void;
  onPrepareApplication: (job: Job) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  candidate,
  jobs,
  applications,
  isDemoMode,
  onNavigateTab,
  onSelectJob,
  onPrepareApplication,
}) => {
  // Compute genuine statistics from live/demo collections
  const totalDiscovered = jobs.length;
  const highMatches = jobs.filter((j) => (j.matchResult?.overallScore || 0) >= 85).length;
  const savedCount = jobs.filter((j) => j.isSaved).length;
  const submittedCount = applications.filter((a) => a.submissionConfirmed || a.status === 'Applied').length;
  const interviewsCount = applications.filter((a) => a.status === 'Interview').length;
  const followUpsDueCount = applications.filter((a) => {
    if (!a.nextFollowUpDate) return false;
    const due = new Date(a.nextFollowUpDate).getTime();
    return due <= Date.now() + 86400000 * 3; // within 3 days
  }).length;

  const topOpportunities = jobs
    .filter((j) => !j.isDismissed)
    .sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0))
    .slice(0, 3);

  const activeInterviews = applications.filter((a) => a.status === 'Interview');

  // Collect recent timeline activity
  const recentActivities: Array<{
    id: string;
    company: string;
    jobTitle: string;
    note: string;
    status: string;
    timestamp: string;
  }> = [];

  applications.forEach((app) => {
    (app.timeline || []).forEach((item) => {
      recentActivities.push({
        id: item.id,
        company: app.company,
        jobTitle: app.jobTitle,
        note: item.note,
        status: item.status,
        timestamp: item.timestamp,
      });
    });
  });

  recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div className="space-y-8">
      {/* Demo Mode Notice Banner if active */}
      {isDemoMode && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/20 px-2 py-0.5 rounded">
              Demo Mode Active
            </span>
            <span>
              Displaying curated verified sample listings and sample tracking data. Switch to Live Feed in the top bar to connect real sources.
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('sources')}
            className="hover:underline text-amber-200 font-medium shrink-0 ml-4"
          >
            Manage Sources
          </button>
        </div>
      )}

      {/* Candidate Profile Spotlight */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700 bg-slate-800 shrink-0">
              <img
                src={avatarImg}
                alt={candidate.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {candidate.name}
                </h1>
                <span className="text-xs text-slate-400 font-mono">
                  · {candidate.location.split(',')[0]}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">{candidate.headline}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-slate-400">
                <span className="text-slate-300 font-medium">Target Roles:</span>
                <span>{candidate.preferredRoles.slice(0, 3).join(', ')}</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-300 font-medium">Active Resume:</span>
                <span className="text-sky-400 font-mono">
                  {candidate.resumeVersions.find((v) => v.isActive)?.fileName || 'Primary Profile'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => onNavigateTab('resume')}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Update Resume</span>
            </button>
            <button
              onClick={() => onNavigateTab('discovery')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm shadow-sky-600/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Discover Matching Jobs</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Numerical Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Discovered</div>
          <div className="text-2xl font-bold text-white mt-1.5 tabular-nums font-mono">
            {totalDiscovered}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across 6 sources</div>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-sky-400 font-medium">High Fit (85%+)</div>
          <div className="text-2xl font-bold text-sky-400 mt-1.5 tabular-nums font-mono">
            {highMatches}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Profile-aligned</div>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Saved Opportunities</div>
          <div className="text-2xl font-bold text-white mt-1.5 tabular-nums font-mono">
            {savedCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Bookmarked</div>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-slate-400 font-medium">Submitted</div>
          <div className="text-2xl font-bold text-white mt-1.5 tabular-nums font-mono">
            {submittedCount}
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-1">Confirmed applications</div>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-indigo-400 font-medium">Interviews</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1.5 tabular-nums font-mono">
            {interviewsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Active rounds</div>
        </div>

        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-4">
          <div className="text-xs text-amber-400 font-medium">Follow-ups Due</div>
          <div className="text-2xl font-bold text-amber-400 mt-1.5 tabular-nums font-mono">
            {followUpsDueCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Next 3 days</div>
        </div>
      </div>

      {/* Main Two-Column Workflow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Top Matched & Verified Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Top Recommended Opportunities</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Highest match scores corroborated on official career pages
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('discovery')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
            >
              <span>View all ({totalDiscovered})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {topOpportunities.map((job) => {
              const score = job.matchResult?.overallScore || 0;
              const isVerified = job.verificationReport.status === 'Verified';

              return (
                <div
                  key={job.id}
                  className="bg-[#111726] border border-slate-800/80 hover:border-slate-700/80 rounded-xl p-5 transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400">
                        <span className="font-semibold text-white text-sm">{job.company}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.location}</span>
                        <span aria-hidden="true">·</span>
                        <span>{job.workArrangement}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-300">{job.source}</span>
                      </div>

                      <h3
                        onClick={() => onSelectJob(job)}
                        className="text-base font-semibold text-white hover:text-sky-400 cursor-pointer transition-colors"
                      >
                        {job.title}
                      </h3>

                      {job.salary?.displayText && (
                        <div className="text-xs text-emerald-400 font-mono">
                          {job.salary.displayText}
                        </div>
                      )}

                      {/* Required skills unboxed inline */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 pt-1">
                        <span className="text-slate-500">Skills:</span>
                        {job.requiredSkills.slice(0, 4).map((skill, idx) => (
                          <span key={idx} className="text-slate-300">
                            {skill}
                            {idx < Math.min(3, job.requiredSkills.length - 1) ? ' · ' : ''}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Match Score & Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className="text-xs text-slate-400">Match Fit:</span>
                          <span className="text-sm font-bold text-sky-400 font-mono tabular-nums">
                            {score}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 justify-end text-[11px]">
                          {isVerified ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified Requisition</span>
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Needs Review</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSelectJob(job)}
                          className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => onPrepareApplication(job)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
                        >
                          Prepare Application
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 span): Upcoming Schedule & Recent Application Activity */}
        <div className="space-y-6">
          {/* Active Interviews & Deadlines */}
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Interviews & Deadlines</span>
              </h2>
              <button
                onClick={() => onNavigateTab('applications')}
                className="text-xs text-slate-400 hover:text-white"
              >
                Tracker
              </button>
            </div>

            {activeInterviews.length > 0 ? (
              <div className="space-y-3">
                {activeInterviews.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-white font-medium">
                      <span>{app.company}</span>
                      <span className="text-indigo-400 font-mono text-[11px]">Round 2</span>
                    </div>
                    <div className="text-slate-400">{app.jobTitle}</div>
                    <div className="text-emerald-400 font-mono text-[11px] pt-0.5">
                      {app.statusReason || 'Technical discussion scheduled'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 py-3 text-center">
                No active interview rounds scheduled currently.
              </div>
            )}
          </div>

          {/* Activity Stream */}
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Application Activity Log</span>
              </h2>
            </div>

            <div className="space-y-3.5">
              {recentActivities.slice(0, 5).map((act) => (
                <div key={act.id} className="text-xs space-y-1 relative pl-4 border-l border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-200">{act.company}</span>
                    <span className="text-slate-500 font-mono">
                      {new Date(act.timestamp).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="text-slate-400 line-clamp-2">{act.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
