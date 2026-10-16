export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Internship' | 'Part-time' | 'Contract';
export type ExperienceLevel = 'Intern' | 'Entry' | 'Mid' | 'Senior' | 'Lead';
export type JobSource =
  | 'Naukri'
  | 'LinkedIn'
  | 'Internshala'
  | 'Foundit'
  | 'Career Page'
  | 'Startup Feed'
  | 'Manual Import';

export type VerificationStatus = 'Verified' | 'Needs Review' | 'High Risk' | 'Unknown';

export interface VerificationCheckDetail {
  id: string;
  name: string;
  passed: boolean;
  severity: 'info' | 'warning' | 'critical';
  details: string;
  sourceChecked?: string;
}

export interface VerificationReport {
  status: VerificationStatus;
  confidence: number; // 0 - 100
  lastChecked: string;
  summary: string;
  checks: VerificationCheckDetail[];
  evidence: string[];
  warnings: string[];
}

export interface MatchDimensionBreakdown {
  technicalSkills: number; // 0 - 100
  relevantExperience: number; // 0 - 100
  projectRelevance: number; // 0 - 100
  educationAndCerts: number; // 0 - 100
  locationAndArrangement: number; // 0 - 100
  seniorityFit: number; // 0 - 100
}

export interface MatchResult {
  overallScore: number; // 0 - 100
  dimensions: MatchDimensionBreakdown;
  strongMatches: string[];
  missingSkills: string[];
  eligibilityConcerns: string[];
  explanation: string;
  recommendations: string[];
  calculatedAt: string;
}

export interface StartupInfo {
  stage: 'Pre-seed' | 'Seed' | 'Series A' | 'Series B+' | 'Bootstrapped';
  industry: string;
  teamSize?: string;
  website?: string;
  equityOffered?: string;
  paidInternship?: boolean;
  foundingTeamRole?: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  workArrangement: WorkArrangement;
  employmentType: EmploymentType;
  experienceLevel: ExperienceLevel;
  minExpYears?: number;
  maxExpYears?: number;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'yearly' | 'monthly' | 'hourly';
    disclosed: boolean;
    displayText?: string;
  };
  description: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  source: JobSource;
  sourceJobId: string;
  originalUrl: string;
  canonicalUrl: string;
  datePosted: string;
  lastChecked: string;
  isStartup: boolean;
  startupInfo?: StartupInfo;
  verificationReport: VerificationReport;
  matchResult?: MatchResult;
  isSaved?: boolean;
  isDismissed?: boolean;
  isDuplicate?: boolean;
  duplicateOfId?: string;
  isDemo?: boolean;
}
