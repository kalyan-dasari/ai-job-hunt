import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Building,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Job } from '../types/job';
import { api } from '../api/client';

interface JobDetailsModalProps {
  job: Job;
  onClose: () => void;
  onPrepareApplication: (job: Job) => void;
  onToggleSave: (jobId: string) => void;
  onToggleDismiss: (jobId: string) => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  onClose,
  onPrepareApplication,
  onToggleSave,
  onToggleDismiss,
}) => {
  const [currentJob, setCurrentJob] = useState<Job>(job);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isMatching, setIsMatching] = useState(false);

  const report = currentJob.verificationReport;
  const match = currentJob.matchResult;
  const isVerified = report.status === 'Verified';
  const isHighRisk = report.status === 'High Risk';

  const handleDeepVerify = async () => {
    setIsVerifying(true);
    try {
      const updatedReport = await api.verifyJob(currentJob.id);
      setCurrentJob({ ...currentJob, verificationReport: updatedReport });
    } catch (err) {
      console.error('Failed to run AI verification audit:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeepMatch = async () => {
    setIsMatching(true);
    try {
      const updatedMatch = await api.matchJob(currentJob.id);
      setCurrentJob({ ...currentJob, matchResult: updatedMatch });
    } catch (err) {
      console.error('Failed to run AI match evaluation:', err);
    } finally {
      setIsMatching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between bg-slate-900/60">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-semibold text-white">{currentJob.company}</span>
              <span aria-hidden="true">·</span>
              <span>{currentJob.location}</span>
              <span aria-hidden="true">·</span>
              <span>{currentJob.workArrangement}</span>
              <span aria-hidden="true">·</span>
              <span>{currentJob.employmentType}</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-300 font-mono">{currentJob.source}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {currentJob.title}
            </h1>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm shrink-0 ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-slate-300">
          {/* Key Facts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Compensation</div>
              <div className="text-sm font-semibold text-emerald-400 font-mono mt-0.5">
                {currentJob.salary?.displayText || 'Undisclosed by source'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Experience Level</div>
              <div className="text-sm font-semibold text-white font-mono mt-0.5">
                {currentJob.experienceLevel} ({currentJob.minExpYears || 0}-{currentJob.maxExpYears || 0} yrs)
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Posted Date</div>
              <div className="text-sm font-semibold text-white font-mono mt-0.5">
                {currentJob.datePosted}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium">Last Source Check</div>
              <div className="text-sm font-semibold text-white font-mono mt-0.5">
                {new Date(currentJob.lastChecked).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Section: AI Authenticity & Fraud Audit */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                ) : isHighRisk ? (
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Job Authenticity & Legitimacy Audit
                  </h2>
                  <div className="text-[11px] text-slate-400">
                    Status: <strong className="text-white">{report.status}</strong> · {report.confidence}% confidence
                  </div>
                </div>
              </div>

              <button
                onClick={handleDeepVerify}
                disabled={isVerifying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700/80 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Auditing...' : 'Re-audit Legitimacy'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">{report.summary}</p>

            {/* Checklist items */}
            <div className="space-y-2 pt-1">
              {report.checks.map((chk) => (
                <div
                  key={chk.id}
                  className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg flex items-start gap-2.5 text-xs"
                >
                  {chk.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : chk.severity === 'critical' ? (
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold text-white">{chk.name}</div>
                    <div className="text-slate-400 mt-0.5">{chk.details}</div>
                  </div>
                </div>
              ))}
            </div>

            {report.warnings.length > 0 && (
              <div className="p-3 bg-red-950/30 border border-red-800/60 rounded-lg text-xs text-red-300 space-y-1">
                <div className="font-semibold text-red-200">Identified Warnings:</div>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {report.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Section: Candidate Match Score Breakdown */}
          {match && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span>Candidate Resume Fit Assessment</span>
                  </h2>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Objective semantic evaluation against your active resume
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-base font-bold text-sky-400 font-mono tabular-nums">
                      {match.overallScore}%
                    </span>
                    <div className="text-[10px] text-slate-500 uppercase">Overall Fit</div>
                  </div>
                  <button
                    onClick={handleDeepMatch}
                    disabled={isMatching}
                    className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg border border-slate-700"
                    title="Recalculate AI Match"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isMatching ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* 6 Dimensions Progress Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Technical Skills</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.technicalSkills}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Relevant Experience</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.relevantExperience}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Project Relevance</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.projectRelevance}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Education & Certs</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.educationAndCerts}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Location & Work Style</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.locationAndArrangement}%
                  </div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <div className="text-[11px] text-slate-400">Seniority Alignment</div>
                  <div className="text-sm font-bold text-white font-mono tabular-nums mt-0.5">
                    {match.dimensions.seniorityFit}%
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{match.explanation}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <div className="font-semibold text-emerald-400">Key Strong Matches:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                    {match.strongMatches.map((sm, i) => (
                      <li key={i}>{sm}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-amber-400">Missing or Weakly Evidenced:</div>
                  <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                    {match.missingSkills.length > 0 ? (
                      match.missingSkills.map((ms, i) => <li key={i}>{ms}</li>)
                    ) : (
                      <li className="text-slate-500">None detected. Full technical coverage.</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Section: Full Job Description & Responsibilities */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
              Requisition Description & Scope
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
              {currentJob.description}
            </p>

            {currentJob.responsibilities.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-semibold text-white">Responsibilities:</h3>
                <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                  {currentJob.responsibilities.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold text-white">Required Skills:</h3>
              <div className="flex flex-wrap gap-1.5">
                {currentJob.requiredSkills.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md text-slate-200"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onToggleSave(currentJob.id);
                setCurrentJob({ ...currentJob, isSaved: !currentJob.isSaved });
              }}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors ${
                currentJob.isSaved
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {currentJob.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{currentJob.isSaved ? 'Saved' : 'Save'}</span>
            </button>

            <a
              href={currentJob.originalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white text-xs flex items-center gap-1.5"
            >
              <span>Source URL</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onPrepareApplication(currentJob);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm"
            >
              Launch Application Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
