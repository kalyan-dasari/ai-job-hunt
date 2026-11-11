import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  Sparkles,
  ChevronDown,
  X,
} from 'lucide-react';
import { CandidateProfile, WorkExperience, EducationItem, ProjectItem, ResumeVersion } from '../types/candidate';
import { api } from '../api/client';
import {
  formatResumeAsPlainText,
  downloadResumeAsDocx,
  printResumeAsPdf,
} from '../utils/documentExport';

interface ResumeWorkspaceViewProps {
  profile: CandidateProfile;
  onUpdateProfile: (updated: Partial<CandidateProfile>) => Promise<void>;
  onUploadResume: (payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => Promise<void>;
}

export const ResumeWorkspaceView: React.FC<ResumeWorkspaceViewProps> = ({
  profile,
  onUpdateProfile,
  onUploadResume,
}) => {
  const [formData, setFormData] = useState<CandidateProfile>(profile);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Resume version management
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Skill entry
  const [newSkillText, setNewSkillText] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<'languages' | 'frameworks' | 'cloudDevops' | 'tools'>('languages');

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  // Copy helper
  const handleCopyText = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Copy complete resume
  const handleCopyEntireResume = () => {
    const plain = formatResumeAsPlainText({
      name: formData.name,
      headline: formData.headline,
      email: formData.email,
      phone: formData.phone,
      location: formData.location,
      summary: formData.summary,
      skills: formData.skills,
      experience: formData.experience,
      projects: formData.projects,
      education: formData.education,
      certifications: formData.certifications,
    });
    handleCopyText(plain, 'all');
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onUpdateProfile(formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save resume profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            await onUploadResume({
              fileBase64: base64,
              mimeType: file.type || 'application/pdf',
              fileName: file.name,
            });
            setIsUploading(false);
            setUploadSuccess(`"${file.name}" uploaded and parsed successfully!`);
            setTimeout(() => setUploadSuccess(null), 5000);
          } catch (err: any) {
            setUploadError(err.message || 'Failed to parse resume');
            setIsUploading(false);
          }
        };
        reader.onerror = () => {
          setUploadError('Failed to read the selected file.');
          setIsUploading(false);
        };
        reader.readAsDataURL(file);
      } else {
        const text = await file.text();
        await onUploadResume({
          rawText: text,
          fileName: file.name,
        });
        setIsUploading(false);
        setUploadSuccess(`"${file.name}" uploaded and parsed successfully!`);
        setTimeout(() => setUploadSuccess(null), 5000);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  // Activate version
  const handleActivateVersion = async (versionId: string) => {
    try {
      const res = await api.setActiveResumeVersion(versionId);
      setFormData(res.profile);
      await onUpdateProfile(res.profile);
    } catch (err: any) {
      console.error('Failed to activate version:', err);
    }
  };

  // Rename version
  const handleRenameVersion = async (versionId: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await api.renameResumeVersion(versionId, renameValue.trim());
      setFormData(res.profile);
      setRenamingVersionId(null);
      setRenameValue('');
    } catch (err: any) {
      console.error('Failed to rename version:', err);
    }
  };

  // Delete version
  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this resume version?')) return;
    try {
      const res = await api.deleteResumeVersion(versionId);
      setFormData(res.profile);
      await onUpdateProfile(res.profile);
    } catch (err: any) {
      console.error('Failed to delete version:', err);
    }
  };

  // Add skill
  const handleAddSkill = () => {
    if (!newSkillText.trim()) return;
    const skill = newSkillText.trim();
    if (formData.skills.includes(skill)) {
      setNewSkillText('');
      return;
    }

    const updatedSkills = [...formData.skills, skill];
    const updatedCats = {
      ...formData.skillCategories,
      [newSkillCategory]: [...(formData.skillCategories[newSkillCategory] || []), skill],
    };

    setFormData({
      ...formData,
      skills: updatedSkills,
      skillCategories: updatedCats,
    });
    setNewSkillText('');
  };

  const handleRemoveSkill = (skill: string) => {
    const updatedSkills = formData.skills.filter((s) => s !== skill);
    const updatedCats = { ...formData.skillCategories };
    for (const cat of ['languages', 'frameworks', 'cloudDevops', 'tools', 'domainSpecialties'] as const) {
      if (updatedCats[cat]) {
        updatedCats[cat] = updatedCats[cat].filter((s) => s !== skill);
      }
    }
    setFormData({
      ...formData,
      skills: updatedSkills,
      skillCategories: updatedCats,
    });
  };

  // Experience manipulation
  const handleAddExperience = () => {
    const newExp: WorkExperience = {
      id: `exp-${Date.now()}`,
      title: 'Software Engineer',
      company: 'Company Name',
      startDate: '2023',
      endDate: 'Present',
      current: true,
      description: 'Describe key responsibilities, contributions, and scalable outcomes achieved.',
      skillsUsed: [],
    };
    setFormData({ ...formData, experience: [newExp, ...formData.experience] });
  };

  const handleUpdateExperience = (id: string, updates: Partial<WorkExperience>) => {
    setFormData({
      ...formData,
      experience: formData.experience.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    });
  };

  const handleDeleteExperience = (id: string) => {
    setFormData({
      ...formData,
      experience: formData.experience.filter((e) => e.id !== id),
    });
  };

  // Projects manipulation
  const handleAddProject = () => {
    const newProj: ProjectItem = {
      id: `proj-${Date.now()}`,
      title: 'Project Title',
      summary: 'High-level project summary highlighting purpose and architecture.',
      techStack: ['Python', 'React'],
      highlights: ['Implemented core logic with high efficiency', 'Designed responsive user interface'],
    };
    setFormData({ ...formData, projects: [newProj, ...formData.projects] });
  };

  const handleUpdateProject = (id: string, updates: Partial<ProjectItem>) => {
    setFormData({
      ...formData,
      projects: formData.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
  };

  const handleDeleteProject = (id: string) => {
    setFormData({
      ...formData,
      projects: formData.projects.filter((p) => p.id !== id),
    });
  };

  // Education manipulation
  const handleAddEducation = () => {
    const newEdu: EducationItem = {
      id: `edu-${Date.now()}`,
      degree: 'B.Tech / Bachelor of Science',
      field: 'Computer Science & Engineering',
      institution: 'University / Institute Name',
      gradYear: '2024',
    };
    setFormData({ ...formData, education: [...formData.education, newEdu] });
  };

  const handleUpdateEducation = (id: string, updates: Partial<EducationItem>) => {
    setFormData({
      ...formData,
      education: formData.education.map((edu) => (edu.id === id ? { ...edu, ...updates } : edu)),
    });
  };

  const handleDeleteEducation = (id: string) => {
    setFormData({
      ...formData,
      education: formData.education.filter((edu) => edu.id !== id),
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Resume Workspace
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Manage your authentic resume profile, versions, and verified skills
          </p>
        </div>

        {/* Global Resume Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'edit'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Edit Content
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                viewMode === 'preview'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>

          {/* Copy Plain Text */}
          <button
            onClick={handleCopyEntireResume}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            title="Copy plain text to clipboard"
          >
            {copiedSection === 'all' ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedSection === 'all' ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download DOCX */}
          <button
            onClick={() => downloadResumeAsDocx(formData)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            title="Download Word Document"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOCX</span>
          </button>

          {/* Download / Print PDF */}
          <button
            onClick={() => printResumeAsPdf(formData)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Upload Feedback Banners */}
      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{uploadSuccess}</span>
        </div>
      )}
      {uploadError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-800 dark:text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Resume Version History & Upload Bar */}
      <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Resume Versions ({formData.resumeVersions?.length || 0})
            </h3>
          </div>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors shrink-0">
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
            <span>{isUploading ? 'Uploading & Parsing...' : 'Upload New Resume (PDF / DOCX)'}</span>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Version List */}
        {formData.resumeVersions && formData.resumeVersions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {formData.resumeVersions.map((ver) => {
              const isActive = ver.id === formData.activeResumeId || ver.isActive;
              const isRenaming = renamingVersionId === ver.id;

              return (
                <div
                  key={ver.id}
                  className={`p-3 rounded-lg border text-xs flex flex-col justify-between gap-2 transition-colors ${
                    isActive
                      ? 'bg-sky-50/50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-800/80 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {isRenaming ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="w-full p-1 text-xs bg-white dark:bg-slate-900 border rounded"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenameVersion(ver.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setRenamingVersionId(null)}
                            className="p-1 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {ver.versionName || ver.fileName}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {ver.fileName} · {Math.round(ver.fileSizeBytes / 1024)} KB
                      </div>
                    </div>

                    {isActive && (
                      <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-sky-500 text-white rounded shrink-0">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                    {!isActive ? (
                      <button
                        onClick={() => handleActivateVersion(ver.id)}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                      >
                        Set as Active
                      </button>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400">Default profile</span>
                    )}

                    <div className="flex items-center gap-1.5">
                      {!isRenaming && (
                        <button
                          onClick={() => {
                            setRenamingVersionId(ver.id);
                            setRenameValue(ver.versionName || ver.fileName);
                          }}
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          title="Rename version"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteVersion(ver.id)}
                        className="text-slate-400 hover:text-red-500"
                        title="Delete version"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-600 dark:text-slate-400 py-1">
            No uploaded versions yet. Upload a PDF or DOCX resume to extract your verified skills and experience.
          </div>
        )}
      </div>

      {/* Main Content: Either Document Preview Mode OR Structured Section Editor */}
      {viewMode === 'preview' ? (
        <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs max-w-3xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
          <div className="text-center pb-4 border-b border-slate-900 dark:border-slate-100">
            <h1 className="text-2xl font-bold tracking-tight">
              {formData.name || 'Candidate Name'}
            </h1>
            {formData.headline && (
              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                {formData.headline}
              </div>
            )}
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
              {[formData.email, formData.phone, formData.location].filter(Boolean).join(' · ')}
            </div>
          </div>

          {formData.summary && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Professional Summary
              </h2>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {formData.summary}
              </p>
            </div>
          )}

          {formData.skills && formData.skills.length > 0 && (
            <div className="space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Technical Skills
              </h2>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {formData.skills.join(' · ')}
              </p>
            </div>
          )}

          {formData.experience && formData.experience.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Work Experience
              </h2>
              {formData.experience.map((exp) => (
                <div key={exp.id} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>{exp.title}</span>
                    <span className="text-slate-600 dark:text-slate-400">
                      {exp.startDate} – {exp.endDate || 'Present'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                    {exp.company}
                  </div>
                  {exp.description && (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                  {exp.skillsUsed && exp.skillsUsed.length > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Technologies: {exp.skillsUsed.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {formData.projects && formData.projects.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Key Projects
              </h2>
              {formData.projects.map((proj) => (
                <div key={proj.id} className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {proj.title}
                  </div>
                  {proj.techStack && proj.techStack.length > 0 && (
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">
                      Tech: {proj.techStack.join(', ')}
                    </div>
                  )}
                  <p className="text-slate-700 dark:text-slate-300">{proj.summary}</p>
                  {proj.highlights && proj.highlights.length > 0 && (
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300 pl-1">
                      {proj.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {formData.education && formData.education.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1">
                Education
              </h2>
              {formData.education.map((edu) => (
                <div key={edu.id} className="flex justify-between text-xs">
                  <div>
                    <span className="font-semibold">{edu.degree} in {edu.field}</span>
                    <div className="text-slate-600 dark:text-slate-400">{edu.institution}</div>
                  </div>
                  <span className="text-slate-600 dark:text-slate-400 font-mono">{edu.gradYear}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Edit Mode: Clean structured sections with per-section copy & edit */
        <div className="space-y-4">
          {/* Section: Candidate Overview */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">
              Candidate Header & Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Kalyan Dasari"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="Full Stack & AI Engineer"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="candidate@example.com"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Hyderabad / Bengaluru, India"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section: Professional Summary */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Professional Summary
              </h3>
              <button
                onClick={() => handleCopyText(formData.summary, 'summary')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {copiedSection === 'summary' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'summary' ? 'Copied' : 'Copy Section'}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Highlight your engineering background, core technical strengths, and commercial impact..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Section: Skills Management */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Technical Skills ({formData.skills.length})
              </h3>
              <button
                onClick={() => handleCopyText(formData.skills.join(', '), 'skills')}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                {copiedSection === 'skills' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === 'skills' ? 'Copied' : 'Copy Skills'}</span>
              </button>
            </div>

            {/* Add skill entry */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSkillText}
                onChange={(e) => setNewSkillText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
                placeholder="Add skill (e.g. FastAPI, Docker, Next.js)..."
                className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
              />
              <select
                value={newSkillCategory}
                onChange={(e) => setNewSkillCategory(e.target.value as any)}
                className="p-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="languages">Languages</option>
                <option value="frameworks">Frameworks</option>
                <option value="cloudDevops">Cloud / DevOps</option>
                <option value="tools">Tools</option>
              </select>
              <button
                onClick={handleAddSkill}
                className="px-3 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors shrink-0"
              >
                Add Skill
              </button>
            </div>

            {/* Skills tag cloud */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {formData.skills.map((skill) => (
                <span
                  key={skill}
                  className="group inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md"
                >
                  <span>{skill}</span>
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Section: Work Experience */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Work Experience ({formData.experience.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = formData.experience
                      .map((e) => `${e.title} at ${e.company} (${e.startDate} - ${e.endDate}):\n${e.description}`)
                      .join('\n\n');
                    handleCopyText(text, 'experience');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {copiedSection === 'experience' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSection === 'experience' ? 'Copied' : 'Copy Experience'}</span>
                </button>

                <button
                  onClick={handleAddExperience}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-md"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Role</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.experience.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                      <input
                        type="text"
                        value={exp.title}
                        onChange={(e) => handleUpdateExperience(exp.id, { title: e.target.value })}
                        placeholder="Job Title"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => handleUpdateExperience(exp.id, { company: e.target.value })}
                        placeholder="Company"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={exp.startDate}
                        onChange={(e) => handleUpdateExperience(exp.id, { startDate: e.target.value })}
                        placeholder="Start Date"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={exp.endDate}
                        onChange={(e) => handleUpdateExperience(exp.id, { endDate: e.target.value })}
                        placeholder="End Date"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={exp.description}
                    onChange={(e) => handleUpdateExperience(exp.id, { description: e.target.value })}
                    placeholder="Role responsibilities and quantifiable achievements..."
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200 leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section: Projects */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Projects ({formData.projects.length})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const text = formData.projects
                      .map((p) => `${p.title} (${p.techStack.join(', ')}):\n${p.summary}`)
                      .join('\n\n');
                    handleCopyText(text, 'projects');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                >
                  {copiedSection === 'projects' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedSection === 'projects' ? 'Copied' : 'Copy Projects'}</span>
                </button>

                <button
                  onClick={handleAddProject}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-md"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Project</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {formData.projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                      <input
                        type="text"
                        value={proj.title}
                        onChange={(e) => handleUpdateProject(proj.id, { title: e.target.value })}
                        placeholder="Project Title"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        value={proj.techStack.join(', ')}
                        onChange={(e) =>
                          handleUpdateProject(proj.id, {
                            techStack: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Tech Stack (comma separated)"
                        className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                      />
                    </div>

                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={proj.summary}
                    onChange={(e) => handleUpdateProject(proj.id, { summary: e.target.value })}
                    placeholder="Project architecture and outcomes..."
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-800 dark:text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section: Education */}
          <div className="p-4 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Education ({formData.education.length})
                </h3>
              </div>

              <button
                onClick={handleAddEducation}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-md"
              >
                <Plus className="w-3 h-3" />
                <span>Add Education</span>
              </button>
            </div>

            <div className="space-y-2">
              {formData.education.map((edu) => (
                <div
                  key={edu.id}
                  className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2 text-xs"
                >
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => handleUpdateEducation(edu.id, { degree: e.target.value })}
                    placeholder="Degree"
                    className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={edu.field}
                    onChange={(e) => handleUpdateEducation(edu.id, { field: e.target.value })}
                    placeholder="Field of Study"
                    className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => handleUpdateEducation(edu.id, { institution: e.target.value })}
                    placeholder="Institution"
                    className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-slate-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={edu.gradYear}
                    onChange={(e) => handleUpdateEducation(edu.id, { gradYear: e.target.value })}
                    placeholder="Grad Year"
                    className="w-20 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-mono text-slate-900 dark:text-white"
                  />
                  <button
                    onClick={() => handleDeleteEducation(edu.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

