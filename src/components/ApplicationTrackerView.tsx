import React, { useState } from 'react';
import {
  Kanban,
  List,
  Search,
  ExternalLink,
  Calendar,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  ShieldCheck,
  Building,
  MoreVertical,
  Check,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/application';

interface ApplicationTrackerViewProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, newStatus: ApplicationStatus, note?: string) => Promise<void>;
  onSelectApplication: (app: ApplicationRecord) => void;
  onNavigateTab: (tab: string) => void;
}

const KANBAN_STAGES: Array<{ status: ApplicationStatus; label: string; color: string }> = [
  { status: 'Saved', label: 'Saved / Interested', color: 'border-slate-700 text-slate-300' },
  { status: 'Preparing', label: 'Preparing', color: 'border-blue-500/40 text-blue-400' },
  { status: 'Ready to Apply', label: 'Ready to Apply', color: 'border-sky-500/40 text-sky-400' },
  { status: 'Applied', label: 'Applied (Confirmed)', color: 'border-emerald-500/40 text-emerald-400' },
  { status: 'Assessment', label: 'Assessment', color: 'border-amber-500/40 text-amber-400' },
  { status: 'Interview', label: 'Interview', color: 'border-indigo-500/40 text-indigo-400' },
  { status: 'Offer', label: 'Offer Received', color: 'border-emerald-400 text-emerald-300' },
  { status: 'Rejected', label: 'Closed / Rejected', color: 'border-red-900/60 text-red-400' },
];

export const ApplicationTrackerView: React.FC<ApplicationTrackerViewProps> = ({
  applications,
  onUpdateStatus,
  onSelectApplication,
  onNavigateTab,
}) => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeAppDetails, setActiveAppDetails] = useState<ApplicationRecord | null>(null);

  let filtered = applications;

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.company.toLowerCase().includes(q) ||
        a.jobTitle.toLowerCase().includes(q) ||
        (a.notes && a.notes.toLowerCase().includes(q))
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter((a) => a.status === statusFilter);
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Header */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Application Lifecycle Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              End-to-end tracking from application preparation to confirmed submission and recruiter interview scheduling.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'kanban' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                  viewMode === 'list' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('discovery')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Track New Vacancy</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filter Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search applications..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto text-xs text-slate-400">
            <span>Filter Stage:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none"
            >
              <option value="all">All Stages ({applications.length})</option>
              {KANBAN_STAGES.map((s) => (
                <option key={s.status} value={s.status}>
                  {s.label} ({applications.filter((a) => a.status === s.status).length})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
          {KANBAN_STAGES.map((stage) => {
            const stageApps = filtered.filter((a) => a.status === stage.status);

            return (
              <div
                key={stage.status}
                className="w-72 shrink-0 bg-[#111726]/90 border border-slate-800/80 rounded-xl p-3 flex flex-col max-h-[750px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-medium">
                  <span className={`font-semibold ${stage.color}`}>{stage.label}</span>
                  <span className="font-mono text-slate-400 tabular-nums bg-slate-900 px-2 py-0.5 rounded text-[11px]">
                    {stageApps.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 mt-3 overflow-y-auto flex-1 pr-1">
                  {stageApps.length === 0 ? (
                    <div className="text-[11px] text-slate-600 text-center py-8">
                      No applications in this stage
                    </div>
                  ) : (
                    stageApps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => setActiveAppDetails(app)}
                        className="bg-slate-900 border border-slate-800/80 hover:border-slate-700 rounded-lg p-3.5 space-y-2 cursor-pointer transition-all hover:bg-slate-900/90 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-white group-hover:text-sky-400 transition-colors">
                            {app.company}
                          </span>
                          <span className="text-[11px] font-mono text-sky-400 tabular-nums">
                            {app.matchScoreAtApplication}%
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 font-medium line-clamp-1">
                          {app.jobTitle}
                        </div>

                        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <span>{app.source}</span>
                          {app.submissionConfirmed && (
                            <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                              <CheckCircle2 className="w-3 h-3" /> Confirmed
                            </span>
                          )}
                        </div>

                        {app.nextFollowUpDate && (
                          <div className="text-[10px] text-amber-400 flex items-center gap-1 pt-0.5">
                            <Clock className="w-3 h-3" /> Follow-up: {app.nextFollowUpDate}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed List View */
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company & Role</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Match</th>
                  <th className="py-3 px-4">Submission Evidence</th>
                  <th className="py-3 px-4">Recruiter / Contact</th>
                  <th className="py-3 px-4">Follow-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{app.company}</div>
                      <div className="text-slate-400">{app.jobTitle}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-200">
                      {app.status}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sky-400 tabular-nums">
                      {app.matchScoreAtApplication}%
                    </td>
                    <td className="py-3.5 px-4">
                      {app.submissionEvidence ? (
                        <div className="text-emerald-400 text-[11px] font-mono flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{app.submissionEvidence.evidenceValue}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Pending submission</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {app.recruiterContact?.name ? (
                        <div>
                          <div className="text-slate-200">{app.recruiterContact.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{app.recruiterContact.email}</div>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Undisclosed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-amber-400">
                      {app.nextFollowUpDate || 'None set'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setActiveAppDetails(app)}
                        className="text-xs text-sky-400 hover:text-sky-300 font-medium px-2 py-1 bg-slate-900 border border-slate-800 rounded"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Detail / Status Update Modal */}
      {activeAppDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-xs text-slate-400">
                  {activeAppDetails.company} · {activeAppDetails.location}
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">{activeAppDetails.jobTitle}</h2>
              </div>
              <button
                onClick={() => setActiveAppDetails(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-400">Change Application Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {KANBAN_STAGES.map((s) => (
                  <button
                    key={s.status}
                    onClick={async () => {
                      await onUpdateStatus(activeAppDetails.id, s.status);
                      setActiveAppDetails({ ...activeAppDetails, status: s.status });
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border text-left transition-colors ${
                      activeAppDetails.status === s.status
                        ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Submission Evidence Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Submission Confirmation Evidence</span>
                {activeAppDetails.submissionConfirmed ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed Submitted
                  </span>
                ) : (
                  <span className="text-amber-400 font-mono text-[11px]">Unconfirmed / In Prep</span>
                )}
              </div>
              <p className="text-slate-400 text-[11px]">
                JobPilot AI strictly avoids marking an application as submitted without actual verification evidence (such as a confirmation number or ATS receipt).
              </p>
              {activeAppDetails.submissionEvidence?.evidenceValue && (
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-slate-300">
                  {activeAppDetails.submissionEvidence.evidenceValue}
                </div>
              )}
            </div>

            {/* Application Timeline Events */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                Application Activity History
              </h3>
              <div className="space-y-2.5">
                {(activeAppDetails.timeline || []).map((ev) => (
                  <div key={ev.id} className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-semibold text-slate-200">{ev.status}</span>
                      <span className="font-mono text-[11px]">{new Date(ev.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400">{ev.note}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <a
                href={activeAppDetails.originalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-xs text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>View original job posting</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setActiveAppDetails(null)}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
