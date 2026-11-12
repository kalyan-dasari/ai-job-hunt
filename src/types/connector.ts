import { JobSource, Job } from './job';

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
  httpStatus?: number;
  pagesFetched?: number;
  rawJobsCount?: number;
  newJobsCount?: number;
  updatedJobsCount?: number;
  duplicatesCount?: number;
  closedJobsCount?: number;
  executionDurationMs?: number;
  isEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerState {
  id: string;
  enabled: boolean;
  scheduleTimeIst: string; // e.g. "07:00"
  intervalHours: number; // e.g. 24
  lastRunAt?: string;
  lastSuccessfulRunAt?: string;
  nextRunAt?: string;
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  lastError?: string;
  catchUpEnabled: boolean;
  updatedAt: string;
  newJobsInLatestScan?: number;
  totalActiveSources?: number;
  successfulSourcesCount?: number;
  failedSourcesCount?: number;
  latestRunId?: string | null;
  latestRunStatus?: string | null;
}

export interface DailyJobStats {
  newlyDiscoveredToday: number;
  newlyPostedLast24h: number;
  newOpeningsLast7d: number;
  recentlyUpdated: number;
  fresherJobs: number;
  internships: number;
  remoteIndia: number;
  byRole: Record<string, number>;
  byLocation: Record<string, number>;
}

export interface DailyDiscoveriesResponse {
  jobs: Job[];
  stats: DailyJobStats;
  scheduler: SchedulerState;
  timeframe: 'today' | '24h' | '7d' | '30d';
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
