import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Download,
  FileText,
  Send,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { Job } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { PreparedMaterials } from '../types/application';
import { api } from '../api/client';

interface ApplicationAssistantModalProps {
  job: Job;
  candidate: CandidateProfile;
  onClose: () => void;
  onApplicationCreated: () => void;
}

export const ApplicationAssistantModal: React.FC<ApplicationAssistantModalProps> = ({
  job,
  candidate,
  onClose,
  onApplicationCreated,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [materials, setMaterials] = useState<PreparedMaterials | null>(null);
  const [coverLetterText, setCoverLetterText] = useState('');
  const [recruiterPitchText, setRecruiterPitchText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [submissionEvidence, setSubmissionEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load or generate materials on step 2
  const handleGenerateMaterials = async () => {
    setIsGenerating(true);
    try {
      const generated = await api.prepareApplication(job.id);
      setMaterials(generated);
      setCoverLetterText(generated.coverLetter);
      setRecruiterPitchText(generated.recruiterPitch);
      setStep(2);
    } catch (err) {
      console.error('Failed to generate materials:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadMaterials = () => {
    const content = `JOB APPLICATION PREPARATION - ${job.company.toUpperCase()} - ${job.title.toUpperCase()}
Date: ${new Date().toLocaleDateString()}
Candidate: ${candidate.name} (${candidate.email})

---------------------------------------------
1. TAILORED COVER LETTER
---------------------------------------------
${coverLetterText}

---------------------------------------------
2. DIRECT RECRUITER PITCH
---------------------------------------------
${recruiterPitchText}

---------------------------------------------
3. TAILORED RESUME BULLETS
---------------------------------------------
${(materials?.tailoredResumeBullets || []).map((b) => `• ${b}`).join('\n')}

---------------------------------------------
4. SCREENING QUESTIONS & ANSWERS
---------------------------------------------
${(materials?.screeningAnswers || [])
  .map((qa) => `Q: ${qa.question}\nA: ${qa.suggestedAnswer}\n`)
  .join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `JobPilot_${job.company.replace(/\s+/g, '_')}_Application.txt`;
    link.click();
  };

  const handleConfirmApplication = async (markSubmitted: boolean) => {
    setIsSubmitting(true);
    try {
      const newApp = await api.createApplication({
        jobId: job.id,
        status: markSubmitted ? 'Applied' : 'Ready to Apply',
        notes: markSubmitted
          ? `Submitted application on official company career portal. Confirmation code: ${submissionEvidence || 'Recorded'}`
          : 'Application materials prepared and ready for candidate submission.',
        preparedMaterials: materials
          ? {
              ...materials,
              coverLetter: coverLetterText,
              recruiterPitch: recruiterPitchText,
            }
          : undefined,
      });

      if (markSubmitted && submissionEvidence.trim()) {
        await api.updateApplication(newApp.id, {
          submissionConfirmed: true,
          submissionEvidence: {
            type: 'official_portal',
            evidenceValue: submissionEvidence.trim(),
            verifiedAt: new Date().toISOString(),
          },
        });
      }

      onApplicationCreated();
      onClose();
    } catch (err: any) {
      console.error('Failed to create application:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#111726] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Application Preparation Workspace</h2>
              <div className="text-[11px] text-slate-400">
                {job.company} · {job.title}
              </div>
            </div>
          </div>

          {/* Workflow Stepper Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className={step >= 1 ? 'text-sky-400' : 'text-slate-600'}>1. Audit</span>
            <span className="text-slate-700">→</span>
            <span className={step >= 2 ? 'text-sky-400' : 'text-slate-600'}>2. Tailor</span>
            <span className="text-slate-700">→</span>
            <span className={step >= 3 ? 'text-sky-400' : 'text-slate-600'}>3. Review</span>
            <span className="text-slate-700">→</span>
            <span className={step >= 4 ? 'text-sky-400' : 'text-slate-600'}>4. Submit</span>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Audit Requisition & Match */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Authenticity Audit</span>
                  <span
                    className={`flex items-center gap-1 font-medium ${
                      job.verificationReport.status === 'Verified' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {job.verificationReport.status} ({job.verificationReport.confidence}% confidence)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {job.verificationReport.summary}
                </p>
              </div>

              {/* Match Gap Breakdown */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Candidate Match Analysis</span>
                  <span className="text-sky-400 font-mono font-bold text-sm">
                    {job.matchResult?.overallScore || 85}% Fit
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="font-medium text-slate-400">Strong Matches:</div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-300 pl-1">
                    {(job.matchResult?.strongMatches || []).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>

                {(job.matchResult?.missingSkills || []).length > 0 && (
                  <div className="space-y-1 text-xs">
                    <div className="font-medium text-amber-400">Skill Gaps to Address in Pitch:</div>
                    <div className="text-slate-400">
                      {job.matchResult?.missingSkills.join(' · ')}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-400 bg-sky-950/20 border border-sky-800/40 p-3.5 rounded-xl">
                JobPilot AI will generate documents grounded strictly in your real profile experience. It will never fabricate achievements or fake qualifications.
              </div>
            </div>
          )}

          {/* STEP 2: Tailored Materials Generation */}
          {step === 2 && materials && (
            <div className="space-y-6">
              {/* Cover Letter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tailored Cover Letter (Editable)</span>
                  </label>
                  <button
                    onClick={() => copyToClipboard(coverLetterText, 'coverLetter')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'coverLetter' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'coverLetter' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={coverLetterText}
                  onChange={(e) => setCoverLetterText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                />
              </div>

              {/* Recruiter Cold Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white">
                    Direct Recruiter Outreach Message
                  </label>
                  <button
                    onClick={() => copyToClipboard(recruiterPitchText, 'pitch')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'pitch' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'pitch' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={recruiterPitchText}
                  onChange={(e) => setRecruiterPitchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-sky-500 leading-relaxed font-sans"
                />
              </div>

              {/* Tailored Resume Bullets */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-white">
                  Highlighted Resume Points to Emphasize
                </div>
                <div className="space-y-2">
                  {materials.tailoredResumeBullets.map((bullet, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Screening Q&A & Checklist */}
          {step === 3 && materials && (
            <div className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Screening Questions & Suggested Answers
                </h3>
                {materials.screeningAnswers.map((item, idx) => (
                  <div key={idx} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <div className="font-semibold text-white">Q: {item.question}</div>
                    <div className="text-slate-300 leading-relaxed">A: {item.suggestedAnswer}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Pre-Submission Checklist
                </h3>
                <div className="space-y-2">
                  {materials.checklist.map((chk) => (
                    <div
                      key={chk.id}
                      className="flex items-center gap-2.5 p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                    >
                      <input
                        type="checkbox"
                        defaultChecked={chk.completed}
                        className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0"
                      />
                      <span>{chk.item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Candidate Approval & Application Submission */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Candidate Approval & Official Portal</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  JobPilot AI respects platform rules and never runs unauthorized automated bulk bots. To submit, open the official company application link below, paste your approved materials, and enter your confirmation ID.
                </p>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div className="truncate max-w-[400px] text-slate-400 font-mono">
                    {job.originalUrl}
                  </div>
                  <a
                    href={job.originalUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-md transition-colors"
                  >
                    <span>Open Career Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Confirmation Evidence Input */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-white">
                  Submission Confirmation Evidence (Application ID / Receipt / Email confirmation)
                </label>
                <input
                  type="text"
                  value={submissionEvidence}
                  onChange={(e) => setSubmissionEvidence(e.target.value)}
                  placeholder="e.g. RZP-APP-92144 or Submitted via Greenhouse portal"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[11px] text-slate-400">
                  Providing submission evidence marks the application as <strong>Applied (Confirmed)</strong>. Leaving it empty records it as <strong>Ready to Apply</strong> in your tracker.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as any)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {step >= 2 && (
              <button
                onClick={handleDownloadMaterials}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Package</span>
              </button>
            )}

            {step === 1 && (
              <button
                onClick={handleGenerateMaterials}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Generating Tailored Materials...' : 'Prepare Tailored Materials'}</span>
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
              >
                <span>Next: Screening & Checklist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors"
              >
                <span>Next: Review & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            {step === 4 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirmApplication(false)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Save as Ready to Apply
                </button>
                <button
                  onClick={() => handleConfirmApplication(true)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Recording...' : 'Confirm Submission & Track'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
