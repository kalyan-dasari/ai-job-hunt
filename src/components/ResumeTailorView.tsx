import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Download,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Building,
  MapPin,
  FileText,
  Briefcase,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { Job } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { PreparedMaterials } from '../types/application';
import { api } from '../api/client';
import {
  formatResumeAsPlainText,
  downloadResumeAsDocx,
  printResumeAsPdf,
} from '../utils/documentExport';

interface ResumeTailorViewProps {
  job: Job;
  candidate: CandidateProfile;
  onBack: () => void;
  onApplicationCreated?: () => void;
  onSaveTailoredVersion?: (versionName: string) => void;
}

export const ResumeTailorView: React.FC<ResumeTailorViewProps> = ({
  job,
  candidate,
  onBack,
  onApplicationCreated,
  onSaveTailoredVersion,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Tailored editable content
  const [tailoredSummary, setTailoredSummary] = useState('');
  const [tailoredBullets, setTailoredBullets] = useState<string[]>([]);
  const [highlightedSkills, setHighlightedSkills] = useState<string[]>([]);
  const [projectNotes, setProjectNotes] = useState<string[]>([]);
  const [versionName, setVersionName] = useState(
    `Tailored - ${job.company} (${job.title.slice(0, 20)})`
  );

  // AI materials loaded from backend prepare API
  const [materials, setMaterials] = useState<PreparedMaterials | null>(null);

  // Initialize tailored state authentically based on candidate's real profile & job
  useEffect(() => {
    // Initial deterministic alignment
    const matchingSkills = (candidate.skills || []).filter((s) =>
      job.requiredSkills.some((req) => req.toLowerCase().includes(s.toLowerCase()))
    );

    const initialSummary =
      candidate.summary ||
      `Results-driven ${candidate.headline || 'Software Engineer'} with hands-on experience in ${matchingSkills.slice(0, 4).join(', ') || 'modern software development'}. Strong focus on building maintainable, high-throughput architectures and shipping reliable solutions aligned with ${job.company}'s engineering standards.`;

    setTailoredSummary(initialSummary);
    setHighlightedSkills(matchingSkills.length > 0 ? matchingSkills : candidate.skills.slice(0, 8));

    // Base bullets from candidate's experience
    const initialBullets = candidate.experience
      .slice(0, 3)
      .map((exp) => `${exp.title} at ${exp.company}: ${exp.description}`)
      .filter(Boolean);

    setTailoredBullets(
      initialBullets.length > 0
        ? initialBullets
        : [
            `Engineered scalable backend services and responsive client interfaces using ${(candidate.skills || []).slice(0, 3).join(', ')}.`,
            `Collaborated with cross-functional product teams to design, test, and ship clean production code.`,
          ]
    );

    setProjectNotes(
      candidate.projects.slice(0, 2).map((p) => `${p.title}: ${p.summary} (${p.techStack.join(', ')})`)
    );

    // Automatically trigger preparation materials
    handleGenerateTailored();
  }, [job.id]);

  const handleGenerateTailored = async () => {
    setIsGenerating(true);
    try {
      const generated = await api.prepareApplication(job.id);
      setMaterials(generated);

      if (generated.tailoredResumeBullets && generated.tailoredResumeBullets.length > 0) {
        setTailoredBullets(generated.tailoredResumeBullets);
      }
    } catch (err) {
      console.error('Failed to generate tailored materials:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Compile full tailored profile object for live preview and download
  const tailoredProfileObject = {
    name: candidate.name,
    headline: `${job.title} | ${candidate.headline || 'Software Engineer'}`,
    email: candidate.email,
    phone: candidate.phone,
    location: candidate.location,
    summary: tailoredSummary,
    skills: Array.from(new Set([...highlightedSkills, ...candidate.skills])),
    experience: candidate.experience.map((exp, idx) => ({
      ...exp,
      description: tailoredBullets[idx] || exp.description,
    })),
    projects: candidate.projects,
    education: candidate.education,
    certifications: candidate.certifications,
  };

  // Save tailored version to SQLite
  const handleSaveVersion = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const fullText = formatResumeAsPlainText(tailoredProfileObject);
      await api.saveTailoredResume(versionName, fullText);
      setSaveSuccess(true);
      if (onSaveTailoredVersion) {
        onSaveTailoredVersion(versionName);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to save tailored resume version:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Create an application record with tailored materials
  const handleRecordApplication = async () => {
    try {
      await api.createApplication({
        jobId: job.id,
        status: 'Preparing',
        notes: `Tailored resume prepared for ${job.title} at ${job.company}`,
        preparedMaterials: materials || undefined,
      });
      alert(`Application record created for ${job.company}!`);
      if (onApplicationCreated) onApplicationCreated();
    } catch (err: any) {
      console.error('Failed to record application:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header: Target Job & Original Resume */}
      <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tailoring for</span>
                <span className="font-semibold text-slate-900 dark:text-white">{job.company}</span>
                <span>·</span>
                <span>{job.location}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {job.title}
              </h1>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateTailored}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Analyzing...' : 'Regenerate'}</span>
            </button>

            <button
              onClick={() => downloadResumeAsDocx(tailoredProfileObject, versionName)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DOCX</span>
            </button>

            <button
              onClick={() => printResumeAsPdf(tailoredProfileObject)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={handleSaveVersion}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {saveSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved to Versions' : 'Save Version'}</span>
            </button>
          </div>
        </div>

        {/* Selected Base Resume Info Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs pt-2 border-t border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800 dark:text-slate-200">Base Candidate:</span>
            <span>{candidate.name} ({candidate.email})</span>
            <span>·</span>
            <span>Match: {job.matchResult?.overallScore || 0}%</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-medium text-slate-800 dark:text-slate-200"
              title="Version Name"
            />
          </div>
        </div>
      </div>

      {/* Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left Column: Editable Tailored Content & Suggestions */}
        <div className="space-y-4">
          {/* Keyword & Skills Alignment Card */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Requisition Keywords & Skill Alignment
              </h3>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                  Matching Candidate Skills (Highlighted on Resume)
                </div>
                <div className="flex flex-wrap gap-1">
                  {highlightedSkills.length > 0 ? (
                    highlightedSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">None detected</span>
                  )}
                </div>
              </div>

              {job.matchResult?.missingSkills && job.matchResult.missingSkills.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-1">
                    Job Requirements to Address in Experience / Projects
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.matchResult.missingSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tailored Professional Summary Editor */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Tailored Professional Summary
              </h3>
              <button
                onClick={() => copyToClipboard(tailoredSummary, 'summary')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {copiedKey === 'summary' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'summary' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={tailoredSummary}
              onChange={(e) => setTailoredSummary(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Tailored Experience Bullet Points */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Relevant Experience Improvements ({tailoredBullets.length})
              </h3>
              <button
                onClick={() => copyToClipboard(tailoredBullets.join('\n'), 'bullets')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {copiedKey === 'bullets' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'bullets' ? 'Copied' : 'Copy Bullets'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {tailoredBullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-sky-500 mt-2 font-bold">•</span>
                  <textarea
                    rows={2}
                    value={bullet}
                    onChange={(e) => {
                      const updated = [...tailoredBullets];
                      updated[idx] = e.target.value;
                      setTailoredBullets(updated);
                    }}
                    className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Project Emphasis */}
          {candidate.projects && candidate.projects.length > 0 && (
            <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
                Project Emphasis
              </h3>
              <div className="space-y-2 text-xs">
                {candidate.projects.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white">{p.title}</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tech: {p.techStack.join(', ')}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300">{p.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Application Tracking Integration Action */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-semibold text-slate-900 dark:text-white">
                Record in Application Tracker
              </div>
              <div className="text-[11px] text-slate-500">
                Saves this tailored role and materials to your Applications tracker.
              </div>
            </div>

            <button
              onClick={handleRecordApplication}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Track Application</span>
            </button>
          </div>
        </div>

        {/* Right Column: Formatted Document Live Preview */}
        <div className="sticky top-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-5 text-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Live Document Preview
              </span>
            </div>

            <button
              onClick={() => {
                const plain = formatResumeAsPlainText(tailoredProfileObject);
                copyToClipboard(plain, 'full_doc');
              }}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              {copiedKey === 'full_doc' ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'full_doc' ? 'Copied' : 'Copy Full Document'}</span>
            </button>
          </div>

          {/* Formatted Resume Body */}
          <div className="space-y-4 text-xs font-sans">
            {/* Header */}
            <div className="text-center pb-3 border-b border-slate-900 dark:border-slate-100">
              <div className="text-xl font-bold tracking-tight">
                {candidate.name || 'Candidate Name'}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                Targeting: {job.title} at {job.company}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {[candidate.email, candidate.phone, candidate.location].filter(Boolean).join(' · ')}
              </div>
            </div>

            {/* Summary */}
            {tailoredSummary && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-0.5">
                  Professional Summary
                </div>
                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  {tailoredSummary}
                </p>
              </div>
            )}

            {/* Skills */}
            {highlightedSkills.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-0.5">
                  Core Technical Skills
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {highlightedSkills.join(' · ')}
                </p>
              </div>
            )}

            {/* Experience */}
            {candidate.experience && candidate.experience.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-0.5">
                  Relevant Work Experience
                </div>
                {candidate.experience.map((exp, idx) => (
                  <div key={exp.id} className="space-y-0.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span>{exp.title}</span>
                      <span className="text-slate-500">{exp.startDate} – {exp.endDate || 'Present'}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 italic">{exp.company}</div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                      {tailoredBullets[idx] || exp.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Projects */}
            {candidate.projects && candidate.projects.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-0.5">
                  Featured Projects
                </div>
                {candidate.projects.slice(0, 2).map((proj) => (
                  <div key={proj.id} className="space-y-0.5 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white">{proj.title}</div>
                    <div className="text-[10px] text-slate-500">Tech: {proj.techStack.join(', ')}</div>
                    <p className="text-slate-700 dark:text-slate-300">{proj.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
