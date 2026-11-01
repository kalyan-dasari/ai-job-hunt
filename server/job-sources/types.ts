import { Job, JobSource, WorkArrangement, EmploymentType, ExperienceLevel } from '../../src/types/job.ts';

export type JobSourceId = JobSource;

export type SourceStatus =
  | 'Active'
  | 'Configured'
  | 'Awaiting Credentials'
  | 'Setup Required'
  | 'Unsupported'
  | 'Rate Limited'
  | 'Error';

export interface SourceCapability {
  supportsSearch: boolean;
  supportsPagination: boolean;
  supportsLocationFilter: boolean;
  requiresAuthentication: boolean;
  authType?: 'API Key' | 'OAuth 2.0' | 'Enterprise Client Secret' | 'None';
  rateLimitDescription: string;
  officialApiDocumentationUrl?: string;
  termsComplianceNote: string;
}

export interface FetchCriteria {
  keywords: string[];
  locations: string[];
  arrangements?: WorkArrangement[];
  employmentTypes?: EmploymentType[];
  experienceLevels?: ExperienceLevel[];
  limit?: number;
  page?: number;
}

export interface RawSourceJob {
  externalId?: string;
  title: string;
  company: string;
  companyLogo?: string;
  location?: string;
  workArrangement?: string;
  employmentType?: string;
  experienceLevel?: string;
  minExpYears?: number;
  maxExpYears?: number;
  description: string;
  responsibilities?: string[];
  skills?: string[];
  preferredSkills?: string[];
  salaryText?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  url: string;
  canonicalUrl?: string;
  postedDate?: string;
  expiryDate?: string;
  sourceName: JobSourceId;
  isStartup?: boolean;
  rawMetadata?: Record<string, any>;
}

export interface FetchResult {
  success: boolean;
  jobs: RawSourceJob[];
  totalFound?: number;
  hasMore?: boolean;
  error?: string;
  warning?: string;
  rateLimitRemaining?: number;
}

export interface JobSourceAdapter {
  id: string;
  source: JobSourceId;
  displayName: string;
  description: string;
  status: SourceStatus;
  capabilities: SourceCapability;
  lastChecked?: string;
  activeJobsCount?: number;

  isConfigured(): boolean;
  testConnection(): Promise<{ success: boolean; message: string; details?: any }>;
  fetchJobs(criteria: FetchCriteria): Promise<FetchResult>;
}

export interface IngestionRunRecord {
  id: string;
  triggerType: 'manual' | 'scheduled';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  sourcesChecked: string[];
  jobsFound: number;
  jobsAdded: number;
  duplicatesFiltered: number;
  errors: string[];
  details?: Record<string, any>;
  createdAt: string;
}

export interface JobSourceReference {
  id: string;
  jobId: string;
  sourceName: JobSourceId | string;
  sourceJobId?: string;
  sourceUrl: string;
  discoveredAt: string;
  rawMetadata?: any;
}
