import React, { useState } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Save,
  Check,
  ChevronDown,
  Layers,
  Briefcase,
  GraduationCap,
  FolderGit2,
} from 'lucide-react';
import { CandidateProfile, WorkExperience, EducationItem, ProjectItem } from '../types/candidate';

interface ResumeProfileViewProps {
  profile: CandidateProfile;
  onUpdateProfile: (updated: Partial<CandidateProfile>) => Promise<void>;
  onUploadResume: (payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => Promise<void>;
}

export const ResumeProfileView: React.FC<ResumeProfileViewProps> = ({
  profile,
  onUpdateProfile,
  onUploadResume,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'raw_text' | 'versions'>('profile');
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [skillCategory, setSkillCategory] = useState<'languages' | 'frameworks' | 'cloudDevops' | 'tools'>('languages');

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await onUploadResume({
              fileBase64: base64,
              mimeType: file.type,
              fileName: file.name,
            });
            setIsUploading(false);
          } catch (err: any) {
            setUploadError(err.message || 'Failed to parse resume');
            setIsUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Plain text or markdown
        const text = await file.text();
        await onUploadResume({
          rawText: text,
          fileName: file.name,
        });
        setIsUploading(false);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file');
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdateProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkill.trim()) return;
    const trimmed = newSkill.trim();
    if (!formData.skills.includes(trimmed)) {
      const updatedSkills = [...formData.skills, trimmed];
      const updatedCategories = {
        ...formData.skillCategories,
        [skillCategory]: [...(formData.skillCategories[skillCategory] || []), trimmed],
      };
      setFormData({
        ...formData,
        skills: updatedSkills,
        skillCategories: updatedCategories,
      });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updatedSkills = formData.skills.filter((s) => s !== skillToRemove);
    const updatedCategories = { ...formData.skillCategories };
    (Object.keys(updatedCategories) as (keyof typeof updatedCategories)[]).forEach((key) => {
      updatedCategories[key] = (updatedCategories[key] || []).filter((s) => s !== skillToRemove);
    });
    setFormData({
      ...formData,
      skills: updatedSkills,
      skillCategories: updatedCategories,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Upload Card */}
      <div className="bg-[#111726] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Candidate Resume & Profile Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Upload your resume in PDF, DOCX, or text format. Our server-side parser extracts verified skills and experience into structured fields for deep match scoring.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="relative inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl cursor-pointer transition-colors shadow-sm shadow-sky-600/20">
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Extracting Resume...' : 'Upload New Resume'}</span>
              <input
                type="file"
                accept=".pdf,.txt,.docx,.md"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 rounded-lg bg-red-950/40 border border-red-800/80 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* View Switcher Subnav */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Structured Profile & Skills
          </button>
          <button
            onClick={() => setActiveTab('raw_text')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'raw_text'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Extracted Transcript
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'versions'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Version History ({formData.resumeVersions.length})
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">1. Candidate Identity & Contact</h2>
              {saveSuccess && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <Check className="w-3.5 h-3.5" /> Saved & Matches Recalculated
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Current Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-400 mb-1 font-medium">Professional Headline</label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <label className="block text-slate-400 mb-1 font-medium">Executive Summary</label>
                <textarea
                  rows={3}
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-sky-500 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Skills Taxonomy */}
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-white">2. Technical & Domain Skills</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Used directly by the resume matching engine to evaluate job suitability.
                </p>
              </div>
            </div>

            {/* Add skill row */}
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                placeholder="Add skill (e.g. Next.js, Kubernetes, PyTorch)..."
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <select
                value={skillCategory}
                onChange={(e) => setSkillCategory(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
              >
                <option value="languages">Languages</option>
                <option value="frameworks">Frameworks & Libs</option>
                <option value="cloudDevops">Cloud & DevOps</option>
                <option value="tools">Tools & DB</option>
              </select>
              <button
                onClick={handleAddSkill}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Categorized Skills Listing (No static pill enclosures - unboxed text with delete affordance) */}
            <div className="space-y-3 pt-2 text-xs">
              <div>
                <span className="text-slate-500 font-medium">Programming Languages:</span>{' '}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(formData.skillCategories?.languages || []).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-200 px-2.5 py-1 rounded-md border border-slate-800"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Frameworks & Libraries:</span>{' '}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(formData.skillCategories?.frameworks || []).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-200 px-2.5 py-1 rounded-md border border-slate-800"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Cloud & Infrastructure:</span>{' '}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(formData.skillCategories?.cloudDevops || []).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-200 px-2.5 py-1 rounded-md border border-slate-800"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-medium">Developer Tools & Databases:</span>{' '}
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(formData.skillCategories?.tools || []).map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-200 px-2.5 py-1 rounded-md border border-slate-800"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-500 hover:text-slate-300"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Verified Work Experience */}
          <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-white">3. Professional Experience</h2>
            </div>

            <div className="space-y-4">
              {formData.experience.map((exp, index) => (
                <div key={exp.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-lg text-xs space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-500 mb-1">Role / Job Title</label>
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => {
                          const updated = [...formData.experience];
                          updated[index].title = e.target.value;
                          setFormData({ ...formData, experience: updated });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Company</label>
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => {
                          const updated = [...formData.experience];
                          updated[index].company = e.target.value;
                          setFormData({ ...formData, experience: updated });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">Start Date</label>
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => {
                          const updated = [...formData.experience];
                          updated[index].startDate = e.target.value;
                          setFormData({ ...formData, experience: updated });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 mb-1">End Date</label>
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => {
                          const updated = [...formData.experience];
                          updated[index].endDate = e.target.value;
                          setFormData({ ...formData, experience: updated });
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">Description & Key Achievements</label>
                    <textarea
                      rows={2}
                      value={exp.description}
                      onChange={(e) => {
                        const updated = [...formData.experience];
                        updated[index].description = e.target.value;
                        setFormData({ ...formData, experience: updated });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Projects & Education */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
                4. Key Technical Projects
              </h2>
              <div className="space-y-3">
                {formData.projects.map((proj) => (
                  <div key={proj.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1.5">
                    <div className="font-semibold text-white">{proj.title}</div>
                    <div className="text-slate-400">{proj.summary}</div>
                    <div className="text-slate-500 text-[11px]">Stack: {proj.techStack.join(' · ')}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
                5. Education & Degree
              </h2>
              <div className="space-y-3">
                {formData.education.map((edu) => (
                  <div key={edu.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-1">
                    <div className="font-semibold text-white">{edu.degree} - {edu.field}</div>
                    <div className="text-slate-400">{edu.institution}</div>
                    <div className="text-slate-500 text-[11px] font-mono">
                      Graduation: {edu.gradYear} {edu.grade ? `(${edu.grade})` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl transition-colors shadow-sm shadow-sky-600/20 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Recalculating Match Scores...' : 'Save Profile & Recalculate Matches'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Raw Transcript View */}
      {activeTab === 'raw_text' && (
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-semibold text-white">Extracted Resume Transcript</h2>
            <span className="text-xs text-slate-500 font-mono">
              {formData.rawResumeText.length} characters
            </span>
          </div>
          <pre className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-[500px]">
            {formData.rawResumeText || 'No text extracted yet.'}
          </pre>
        </div>
      )}

      {/* Versions View */}
      {activeTab === 'versions' && (
        <div className="bg-[#111726] border border-slate-800/80 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
            Resume Versions & Upload Audit History
          </h2>
          <div className="space-y-3">
            {formData.resumeVersions.map((version) => (
              <div
                key={version.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{version.fileName}</span>
                    {version.isActive && (
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                        Active Profile Source
                      </span>
                    )}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Uploaded: {new Date(version.uploadedAt).toLocaleString()} · {(version.fileSizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>

                {!version.isActive && (
                  <button
                    onClick={() => {
                      const updated = formData.resumeVersions.map((v) => ({
                        ...v,
                        isActive: v.id === version.id,
                      }));
                      setFormData({ ...formData, resumeVersions: updated, activeResumeId: version.id });
                    }}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg"
                  >
                    Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
