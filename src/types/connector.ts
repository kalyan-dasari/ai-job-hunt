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
