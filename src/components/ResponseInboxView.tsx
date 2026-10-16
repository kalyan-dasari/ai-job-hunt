import React, { useState } from 'react';
import {
  Mail,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Check,
  Send,
} from 'lucide-react';
import { EmailMessageRecord, ApplicationRecord } from '../types/application';
import { api } from '../api/client';

interface ResponseInboxViewProps {
  emails: EmailMessageRecord[];
  applications: ApplicationRecord[];
  onRefresh: () => void;
}

export const ResponseInboxView: React.FC<ResponseInboxViewProps> = ({
  emails,
  applications,
  onRefresh,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailMessageRecord | null>(
    emails.length > 0 ? emails[0] : null
  );
  const [showLogModal, setShowLogModal] = useState(false);
  const [fromInput, setFromInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('');
  const [bodyInput, setBodyInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const handleApplyStatus = async (emailId: string) => {
    try {
      const res = await api.applyEmailStatus(emailId);
      setAppliedNotice(`Updated status to ${res.email.suggestedStatusChange} for ${res.application.company}!`);
      setTimeout(() => setAppliedNotice(null), 4000);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to apply email status:', err);
    }
  };

  const handleLogNewEmail = async () => {
    if (!bodyInput.trim()) return;
    setIsParsing(true);
    try {
      const newEmail = await api.logEmail({
        from: fromInput.trim() || 'recruiter@company.com',
        subject: subjectInput.trim() || 'Application Notification',
        fullBody: bodyInput.trim(),
      });
      setShowLogModal(false);
      setFromInput('');
      setSubjectInput('');
      setBodyInput('');
      setSelectedEmail(newEmail);
      onRefresh();
    } catch (err: any) {
      console.error('Failed to parse email:', err);
    } finally {
      setIsParsing(false);
    }
  };

  // Sample email presets to make testing delightful
  const loadPreset = (type: 'interview' | 'assessment' | 'offer') => {
    if (type === 'interview') {
      setFromInput('priya.talent@swiggy.in');
      setSubjectInput('Invitation for Technical Interview - Frontend Engineering');
      setBodyInput(
        `Hi Priya,\n\nWe were impressed by your resume and full-stack project portfolio. We would love to invite you for a 60-minute technical interview with our Lead Architect next Tuesday at 2:00 PM IST.\n\nPlease reply with your availability.\n\nWarm regards,\nSwiggy Engineering Talent Acquisition`
      );
    } else if (type === 'assessment') {
      setFromInput('talent-ops@atlassian.com');
      setSubjectInput('Atlassian Online Coding Assessment');
      setBodyInput(
        `Dear Candidate,\n\nThank you for applying to Atlassian. The next step is a 90-minute HackerRank coding challenge focusing on algorithms and concurrency. Please complete the assessment within 5 days.\n\nAtlassian Recruitment Operations`
      );
    } else if (type === 'offer') {
      setFromInput('founders@hyperscalesys.io');
      setSubjectInput('Offer of Employment: Founding Engineer at HyperScale Systems');
      setBodyInput(
        `Dear Priya,\n\nOn behalf of HyperScale Systems, we are thrilled to extend an offer for the Founding Engineer position. The package includes ₹28,00,000 per annum + 0.8% equity grant with standard 4-year vesting.\n\nWe look forward to building the future of distributed inference together.\n\nBest,\nFounders, HyperScale Systems`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Recruiter Communications & Response Inbox
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              JobPilot AI analyzes recruiter responses, detects assessment requests, interview invitations, or offers, and safely suggests tracker updates with user confirmation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowLogModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Log Recruiter Message</span>
            </button>
          </div>
        </div>

        {appliedNotice && (
          <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{appliedNotice}</span>
          </div>
        )}
      </div>

      {/* Two-Pane Email Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane: Email List */}
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-3 space-y-2 max-h-[700px] overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 px-2 py-1">
            Logged Inbound Messages ({emails.length})
          </div>

          {emails.map((msg) => {
            const isSelected = selectedEmail?.id === msg.id;
            const categoryBadge =
              msg.detectedType === 'interview_invite'
                ? 'text-indigo-400'
                : msg.detectedType === 'assessment'
                ? 'text-amber-400'
                : msg.detectedType === 'offer'
                ? 'text-emerald-400'
                : msg.detectedType === 'rejection'
                ? 'text-red-400'
                : 'text-sky-400';

            return (
              <div
                key={msg.id}
                onClick={() => setSelectedEmail(msg)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all space-y-1.5 ${
                  isSelected
                    ? 'bg-slate-900 border-sky-500/50'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white line-clamp-1">{msg.from}</span>
                  <span className={`text-[10px] font-mono uppercase font-semibold ${categoryBadge}`}>
                    {msg.detectedType.replace('_', ' ')}
                  </span>
                </div>

                <div className="text-slate-300 font-medium line-clamp-1">{msg.subject}</div>
                <div className="text-slate-400 text-[11px] line-clamp-2">{msg.snippet}</div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                  <span>{new Date(msg.receivedAt).toLocaleDateString()}</span>
                  {msg.statusChangeApplied ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Status Applied
                    </span>
                  ) : msg.suggestedStatusChange ? (
                    <span className="text-amber-400">Suggests: {msg.suggestedStatusChange}</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Pane: Message Viewer & Action Bar */}
        <div className="lg:col-span-2 bg-[#111726] border border-slate-800/80 rounded-xl p-6 flex flex-col justify-between space-y-6">
          {selectedEmail ? (
            <div className="space-y-5">
              {/* Message Header */}
              <div className="border-b border-slate-800 pb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>From: <strong className="text-slate-200">{selectedEmail.from}</strong></span>
                  <span className="font-mono">{new Date(selectedEmail.receivedAt).toLocaleString()}</span>
                </div>
                <h2 className="text-base font-bold text-white">{selectedEmail.subject}</h2>
              </div>

              {/* AI Detection Callout */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-white">
                      AI Intent Classification ({selectedEmail.confidence}% Confidence)
                    </span>
                  </div>
                  <span className="font-mono text-indigo-400 uppercase text-[11px]">
                    {selectedEmail.detectedType.replace('_', ' ')}
                  </span>
                </div>

                {selectedEmail.suggestedStatusChange && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
                    <div className="text-slate-300">
                      Recommendation: Update tracker status to{' '}
                      <strong className="text-white font-mono">{selectedEmail.suggestedStatusChange}</strong>
                    </div>

                    {!selectedEmail.statusChangeApplied ? (
                      <button
                        onClick={() => handleApplyStatus(selectedEmail.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Apply Status Update</span>
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Tracker Updated
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Safe Message Body */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sanitized Body Content (Untrusted Input)
                </div>
                <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-sans whitespace-pre-line leading-relaxed max-h-[350px] overflow-y-auto">
                  {selectedEmail.fullBody}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select an email message on the left to inspect AI categorization.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Log New Inbound Recruiter Email */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span>Log Recruiter Email Message</span>
              </h2>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] text-slate-400">Quick Test Presets:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => loadPreset('interview')}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded"
                >
                  Swiggy Interview
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('assessment')}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded"
                >
                  Atlassian Assessment
                </button>
                <button
                  type="button"
                  onClick={() => loadPreset('offer')}
                  className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded"
                >
                  HyperScale Offer
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Sender Email</label>
                <input
                  type="text"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  placeholder="e.g. recruiter@company.com"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Subject</label>
                <input
                  type="text"
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  placeholder="e.g. Next steps regarding your application"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Email Body Text</label>
                <textarea
                  rows={6}
                  value={bodyInput}
                  onChange={(e) => setBodyInput(e.target.value)}
                  placeholder="Paste raw email content here..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowLogModal(false)}
                className="px-3.5 py-2 text-xs text-slate-400 hover:text-white bg-slate-900 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLogNewEmail}
                disabled={isParsing || !bodyInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isParsing ? 'Analyzing with Gemini...' : 'Analyze & Log Email'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
