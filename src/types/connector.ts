import { JobSource } from './job';

export type ConnectorStatus = 'Active' | 'Demo' | 'Configured' | 'Setup Required' | 'Restricted' | 'Awaiting Credentials';

export interface ProviderUsageInfo {
  provider: string;
  monthlyQuota: number;
  requestsUsed: number;
  requestsRemaining: number;
  currentMonth: string;
  lastRequestAt?: string;
  cachedQueriesCount?: number;
}

export interface SourceConnector {
  id: string;
  name: JobSource;
  displayName: string;
  description: string;
  status: ConnectorStatus;
  accessMethod: 'Authorized Feed' | 'Official Career Scraper' | 'Direct API' | 'Verified Partner';
  requiresAuth: boolean;
  termsCompliant: boolean;
  rateLimitInfo: string;
  lastSyncTimestamp?: string;
  activeJobsCount: number;
  setupInstructions: string;
  usage?: ProviderUsageInfo;
}

export type CompanySourceStatus = 'active' | 'limited' | 'blocked' | 'disabled' | 'error' | 'paused';

export interface CompanySource {
  id: string;
  name: string;
  websiteUrl: string;
  careersUrl: string;
  atsProvider?: string; // 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters' | 'recruitee' | 'personio' | 'breezy' | 'teamtailor' | 'rippling' | 'workday' | 'generic'
  atsSlug?: string;
  status: CompanySourceStatus;
  lastCrawlAt?: string;
  lastSuccessfulCrawlAt?: string;
  lastError?: string;
  crawlFrequencyHours: number;
  jobsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryAttempt {
  id: string;
  companyId?: string;
  url: string;
  status: 'success' | 'failed' | 'skipped';
  httpStatus?: number;
  errorMessage?: string;
  jobsFound: number;
  attemptedAt: string;
}

export interface SourceQualityMetrics {
  totalSources: number;
  activeSources: number;
  successfullyFetchedSources: number;
  failedSources: number;
  totalJobsDiscovered: number;
  indiaRelevantJobs: number;
  fresherFriendlyJobs: number;
  jobsRequiringExperience: number;
  unclearExperienceJobs: number;
  expiredJobs: number;
  jobsWithWorkingLinks: number;
  lastSuccessfulDiscovery?: string;
  locationBreakdown: {
    hyderabad: number;
    bengaluru: number;
    chennai: number;
    pune: number;
    mumbai: number;
    delhiNcr: number;
    otherIndianCities: number;
    remoteIndia: number;
    internationalRemote: number;
    internationalLocation: number;
    unknown: number;
  };
  sourceStatusBreakdown: {
    configured: number;
    active: number;
    successfullyFetched: number;
    failed: number;
    temporarilyUnavailable: number;
    noCurrentVacancies: number;
  };
  recentExclusions: Array<{
    title: string;
    company: string;
    location: string;
    source: string;
    reason: string;
  }>;
}
