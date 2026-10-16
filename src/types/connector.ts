import { JobSource } from './job';

export type ConnectorStatus = 'Active' | 'Demo' | 'Configured' | 'Setup Required' | 'Restricted';

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
}
