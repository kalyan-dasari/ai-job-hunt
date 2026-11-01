export interface WorkExperience {
  id: string;
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  skillsUsed: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  field: string;
  institution: string;
  gradYear: string;
  grade?: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  summary: string;
  techStack: string[];
  link?: string;
  highlights: string[];
}

export interface SkillCategories {
  languages: string[];
  frameworks: string[];
  cloudDevops: string[];
  tools: string[];
  domainSpecialties: string[];
}

export interface ResumeVersion {
  id: string;
  fileName: string;
  uploadedAt: string;
  fileSizeBytes: number;
  extractedTextLength: number;
  versionName: string;
  isActive: boolean;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: string[];
  skillCategories: SkillCategories;
  experience: WorkExperience[];
  education: EducationItem[];
  projects: ProjectItem[];
  certifications: string[];
  preferredRoles: string[];
  preferredLocations: string[];
  preferredArrangements: ('Remote' | 'Hybrid' | 'On-site')[];
  preferredTypes: ('Full-time' | 'Internship' | 'Part-time' | 'Contract')[];
  minExpectedSalary?: number;
  workAuthorization: string;
  rawResumeText: string;
  resumeVersions: ResumeVersion[];
  activeResumeId: string;
  updatedAt: string;
}

export const emptyCandidateProfile: CandidateProfile = {
  id: 'candidate-default',
  name: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
  summary: '',
  skills: [],
  skillCategories: {
    languages: [],
    frameworks: [],
    cloudDevops: [],
    tools: [],
    domainSpecialties: [],
  },
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  preferredRoles: [],
  preferredLocations: [],
  preferredArrangements: [],
  preferredTypes: [],
  workAuthorization: '',
  rawResumeText: '',
  resumeVersions: [],
  activeResumeId: '',
  updatedAt: new Date().toISOString(),
};
