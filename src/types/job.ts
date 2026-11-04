export type WorkArrangement = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType = 'Full-time' | 'Internship' | 'Part-time' | 'Contract';
export type ExperienceLevel = 'Intern' | 'Entry' | 'Mid' | 'Senior' | 'Lead';
export type JobSource =
  | 'Greenhouse'
  | 'Lever'
  | 'Ashby'
  | 'Workable'
  | 'SmartRecruiters'
  | 'Recruitee'
  | 'Personio'
  | 'Breezy HR'
  | 'Teamtailor'
  | 'Rippling'
  | 'Workday'
  | 'JSON-LD'
  | 'RSS Feed'
  | 'Career Page'
  | 'Startup Feed'
  | 'JSearch'
  | 'Adzuna'
  | 'Naukri'
  | 'LinkedIn'
  | 'Internshala'
  | 'Foundit'
  | 'Manual Import';

export type VerificationStatus = 'Verified' | 'Needs Review' | 'High Risk' | 'Unknown';
export type FreshnessStatus = 'Newly Discovered' | 'Active' | 'Potentially Stale' | 'Expired' | 'Closed';

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
  domainRelevance?: number; // 0 - 100
  titleRelevance?: number; // 0 - 100
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
  // Dossier-style detailed evaluation fields
  reasoningSummary?: string;
  experienceExplanation?: string;
  isFresherEligible?: boolean;
  fresherExplanation?: string;
  locationCompatibilityNote?: string;
  riskAssessment?: string;
  mandatoryRequirementsMet?: boolean;
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
  companyWebsite?: string;
  location: string;
  country?: string;
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
  sourceType?: 'ATS' | 'CareerPage' | 'JSON-LD' | 'RSS' | 'Aggregator' | 'Manual';
  sourceJobId: string;
  originalUrl: string;
  canonicalUrl: string;
  applicationUrl?: string;
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
  freshnessStatus?: FreshnessStatus;
  expiryDate?: string;
  lastVerifiedAt?: string;
  isDemo?: boolean;
}
