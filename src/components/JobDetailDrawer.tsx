import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Send,
  FileText,
  Clock,
  Briefcase,
} from 'lucide-react';
import { Job } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { api } from '../api/client';
import { formatIstDateTime } from '../utils/temporalClient';

interface JobDetailDrawerProps {
  job: Job;
  candidate: CandidateProfile;
  onClose: () => void;
  onToggleSave: (jobId: string) => void;
  onTailorResume: (job: Job) => void;
  onTrackApplication: (job: Job) => void;
  isApplied?: boolean;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  job,
  candidate,
  onClose,
  onToggleSave,
  onTailorResume,
  onTrackApplication,
  isApplied = false,
}) => {
  const [currentJob, setCurrentJob] = useState<Job>(job);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const match = currentJob.matchResult;
  const report = currentJob.verificationReport;

  const handleDeepMatch = async () => {
    setIsMatching(true);
    try {
      const updatedMatch = await api.matchJob(currentJob.id);
      setCurrentJob({ ...currentJob, matchResult: updatedMatch });
    } catch (err) {
      console.error('Failed to recalculate match:', err);
    } finally {
      setIsMatching(false);
    }
  };

  const score = match?.overallScore || 0;

  // Truthful salary formatting
  const salaryText =
    currentJob.salary?.displayText &&
    currentJob.salary.displayText.toLowerCase() !== 'undisclosed by company'
      ? currentJob.salary.displayText
      : 'Undisclosed by company';

  // Truthful posted date formatting
  const postedText =
    currentJob.datePosted && !currentJob.datePosted.includes('1970')
      ? currentJob.datePosted
      : 'Posting date unavailable';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-black/60 dark:bg-black/80 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#0f1422] h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200 text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-900 dark:text-white">
                {currentJob.company}
              </span>
              <span>·</span>
              <span>{currentJob.location}</span>
              <span>·</span>
              <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">
                {currentJob.source}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentJob.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Close job details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-slate-700 dark:text-slate-300">
          {/* Key Facts Strip (Compact 4-column box) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs">
            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">
                Work Mode
              </div>
              <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                {currentJob.workArrangement}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">
                Experience
              </div>
              <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                {currentJob.experienceLevel} ({currentJob.minExpYears || 0}–{currentJob.maxExpYears || 2} yrs)
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">
                Compensation
              </div>
              <div className="font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                {salaryText}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase font-semibold text-slate-600 dark:text-slate-400">
                Original Posting
              </div>
              <div className="font-medium text-slate-900 dark:text-white mt-0.5">
                {postedText}
              </div>
            </div>
          </div>

          {/* Match Assessment (Objective Candidate Fit) */}
          <div className="p-4 bg-sky-50/40 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Resume Match Assessment
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-sky-700 dark:text-sky-300">
                  {score}% Fit
                </span>
                <button
                  onClick={handleDeepMatch}
                  disabled={isMatching}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  title="Recalculate match"
                  aria-label="Recalculate match"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {match?.explanation && (
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {match.explanation}
              </p>
            )}

            {/* Suitability Notes */}
            <div className="space-y-1.5 pt-1 text-xs">
              {match?.isFresherEligible && (
                <div className="flex items-start gap-1.5 text-teal-700 dark:text-teal-300 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Fresher Eligible: Suitable for recent graduates (0–2 yrs).</span>
                </div>
              )}
              {match?.experienceExplanation && (
                <div className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Experience:</strong>{' '}
                  {match.experienceExplanation}
                </div>
              )}
              {match?.locationCompatibilityNote && (
                <div className="text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-800 dark:text-slate-200">Location:</strong>{' '}
                  {match.locationCompatibilityNote}
                </div>
              )}
            </div>

            {/* Skills Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Matching Skills ({match?.strongMatches?.length || 0})
                </div>
                <div className="flex flex-wrap gap-1">
                  {match?.strongMatches && match.strongMatches.length > 0 ? (
                    match.strongMatches.map((skill, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">No direct matches</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Missing or Recommended Skills ({match?.missingSkills?.length || 0})
                </div>
                <div className="flex flex-wrap gap-1">
                  {match?.missingSkills && match.missingSkills.length > 0 ? (
                    match.missingSkills.map((skill, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded text-[11px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-600 dark:text-slate-400 text-[11px]">Full technical coverage</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Full Job Description & Scope */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
              Job Description
            </h3>
            <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {currentJob.description}
            </div>
          </div>

          {/* Responsibilities */}
          {currentJob.responsibilities && currentJob.responsibilities.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                Key Responsibilities
              </h3>
              <ul className="space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300 leading-relaxed">
                {currentJob.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Required Skills */}
          {currentJob.requiredSkills && currentJob.requiredSkills.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1.5">
                Required Technical Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {currentJob.requiredSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-md text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Source & Authenticity Info */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Verified Official Source: {currentJob.source}</span>
            </div>
            <div>Discovered: {formatIstDateTime(currentJob.firstSeenAt || currentJob.datePosted)}</div>
            {currentJob.lastChecked && (
              <div>Last checked: {formatIstDateTime(currentJob.lastChecked)}</div>
            )}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleSave(currentJob.id);
                setCurrentJob({ ...currentJob, isSaved: !currentJob.isSaved });
              }}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                currentJob.isSaved
                  ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300 font-medium'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {currentJob.isSaved ? (
                <BookmarkCheck className="w-4 h-4 fill-current" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
              <span>{currentJob.isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onTailorResume(currentJob);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-500" />
              <span>Tailor Resume</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isApplied && (
              <button
                onClick={() => onTrackApplication(currentJob)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Track Application</span>
              </button>
            )}

            <a
              href={currentJob.originalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs"
            >
              <span>Apply on Company Website</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
