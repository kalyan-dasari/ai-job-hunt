import React, { useState } from 'react';
import {
  Layers,
  Search,
  ExternalLink,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Briefcase,
  ChevronDown,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus } from '../types/application';
import { Job } from '../types/job';
import { formatIstDateTime } from '../utils/temporalClient';

interface ApplicationsViewProps {
  applications: ApplicationRecord[];
  jobs: Job[];
  onUpdateStatus: (id: string, newStatus: ApplicationStatus, note?: string) => Promise<void>;
  onSelectJob: (job: Job) => void;
  onNavigateDiscover: () => void;
}

const ALL_STATUSES: ApplicationStatus[] = [
  'Preparing',
  'Ready to Apply',
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  jobs,
  onUpdateStatus,
  onSelectJob,
  onNavigateDiscover,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  // Status counts
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filtered applications
  const filteredApps = applications.filter((app) => {
    if (selectedStatusFilter !== 'all' && app.status !== selectedStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        app.company.toLowerCase().includes(q) ||
        app.jobTitle.toLowerCase().includes(q) ||
        (app.notes && app.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const getMatchedJob = (jobId: string) => {
    return jobs.find((j) => j.id === jobId);
  };

  const handleSaveNote = async (id: string, currentStatus: ApplicationStatus) => {
    await onUpdateStatus(id, currentStatus, noteValue);
    setEditingNoteId(null);
    setNoteValue('');
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Applications
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Track and manage your active submissions across companies and interview stages
          </p>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
          {applications.length} {applications.length === 1 ? 'total application' : 'total applications'}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            No tracked applications yet
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
            When you apply for a job or tailor your resume, record it here to track its interview status and notes.
          </p>
          <button
            onClick={onNavigateDiscover}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors"
          >
            <span>Discover Jobs to Apply</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Status Filter Chips Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors border ${
                selectedStatusFilter === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium border-transparent shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              All ({applications.length})
            </button>

            {ALL_STATUSES.map((status) => {
              const count = statusCounts[status] || 0;
              if (count === 0 && selectedStatusFilter !== status) return null;
              const isSelected = selectedStatusFilter === status;

              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatusFilter(status)}
                  className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors border ${
                    isSelected
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-medium border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>

          {/* Compact Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/40 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Company</th>
                    <th className="py-2.5 px-3.5">Job Title</th>
                    <th className="py-2.5 px-3.5">Applied / Updated</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Next Action / Notes</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {filteredApps.map((app) => {
                    const matchedJob = getMatchedJob(app.jobId);
                    const isEditingNote = editingNoteId === app.id;

                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Company */}
                        <td className="py-3 px-3.5 font-medium text-slate-900 dark:text-white">
                          {app.company}
                        </td>

                        {/* Job Title */}
                        <td className="py-3 px-3.5">
                          <button
                            onClick={() => {
                              if (matchedJob) onSelectJob(matchedJob);
                            }}
                            className="font-medium text-slate-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-400 text-left hover:underline truncate max-w-xs block"
                          >
                            {app.jobTitle}
                          </button>
                        </td>

                        {/* Applied Date */}
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {formatIstDateTime(app.appliedAt || app.createdAt)}
                        </td>

                        {/* Status Dropdown */}
                        <td className="py-3 px-3.5">
                          <select
                            value={app.status}
                            onChange={(e) =>
                              onUpdateStatus(app.id, e.target.value as ApplicationStatus)
                            }
                            className={`p-1 text-xs rounded-md border cursor-pointer font-medium ${
                              app.status === 'Applied'
                                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : app.status === 'Interview'
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : app.status === 'Offer'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : app.status === 'Rejected'
                                ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Next Action / Notes */}
                        <td className="py-3 px-3.5 max-w-sm">
                          {isEditingNote ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={noteValue}
                                onChange={(e) => setNoteValue(e.target.value)}
                                className="w-full p-1 text-xs bg-slate-50 dark:bg-slate-900 border rounded"
                                placeholder="Add follow-up notes..."
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveNote(app.id, app.status)}
                                className="px-2 py-1 text-[11px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="px-1 text-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setEditingNoteId(app.id);
                                setNoteValue(app.notes || '');
                              }}
                              className="cursor-pointer group flex items-center justify-between text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                              title="Click to edit notes"
                            >
                              <span className="truncate">
                                {app.notes || 'Click to add follow-up notes...'}
                              </span>
                              <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {matchedJob && (
                            <button
                              onClick={() => onSelectJob(matchedJob)}
                              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                            >
                              View Job
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
