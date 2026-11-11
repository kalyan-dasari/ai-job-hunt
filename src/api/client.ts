import { Job, VerificationReport, MatchResult } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { ApplicationRecord, EmailMessageRecord, NotificationItem, PreparedMaterials } from '../types/application';
import { SourceConnector, CompanySource, SchedulerState, DailyDiscoveriesResponse } from '../types/connector';

export const api = {
  // Candidate Profile
  async getProfile(): Promise<CandidateProfile> {
    const res = await fetch('/api/candidate');
    if (!res.ok) throw new Error('Failed to load profile');
    return res.json();
  },

  async updateProfile(profile: Partial<CandidateProfile>): Promise<CandidateProfile> {
    const res = await fetch('/api/candidate', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async uploadResume(payload: {
    rawText?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }): Promise<{ success: boolean; profile: CandidateProfile; fallback?: boolean }> {
    const res = await fetch('/api/candidate/upload-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload and parse resume');
    }
    return res.json();
  },

  // Jobs
  async getJobs(params?: Record<string, string>): Promise<{ total: number; jobs: Job[] }> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/jobs${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to fetch jobs');
    return res.json();
  },

  async getJobById(id: string): Promise<Job> {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error('Job not found');
    return res.json();
  },

  async toggleSaveJob(id: string): Promise<Job> {
    const res = await fetch(`/api/jobs/${id}/save`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to update job');
    return res.json();
  },

  async toggleDismissJob(id: string): Promise<Job> {
    const res = await fetch(`/api/jobs/${id}/dismiss`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Failed to dismiss job');
    return res.json();
  },

  async verifyJob(id: string): Promise<VerificationReport> {
    const res = await fetch(`/api/jobs/${id}/verify`, { method: 'POST' });
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  },

  async matchJob(id: string): Promise<MatchResult> {
    const res = await fetch(`/api/jobs/${id}/match`, { method: 'POST' });
    if (!res.ok) throw new Error('Match evaluation failed');
    return res.json();
  },

  async importJobs(payload: { items: any; format: 'json' | 'csv' }): Promise<{
    success: boolean;
    addedCount: number;
    duplicateCount: number;
    totalJobs: number;
  }> {
    const res = await fetch('/api/jobs/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to import jobs');
    return res.json();
  },

  // Application Assistant
  async prepareApplication(jobId: string): Promise<PreparedMaterials> {
    const res = await fetch('/api/applications/prepare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId }),
    });
    if (!res.ok) throw new Error('Failed to prepare application');
    return res.json();
  },

  // Applications
  async getApplications(): Promise<ApplicationRecord[]> {
    const res = await fetch('/api/applications');
    if (!res.ok) throw new Error('Failed to fetch applications');
    return res.json();
  },

  async createApplication(data: {
    jobId: string;
    status?: string;
    notes?: string;
    preparedMaterials?: PreparedMaterials;
  }): Promise<ApplicationRecord> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create application');
    }
    return res.json();
  },

  async updateApplication(id: string, updates: Partial<ApplicationRecord>): Promise<ApplicationRecord> {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update application');
    return res.json();
  },

  // Emails
  async getEmails(): Promise<EmailMessageRecord[]> {
    const res = await fetch('/api/emails');
    if (!res.ok) throw new Error('Failed to fetch emails');
    return res.json();
  },

  async logEmail(payload: { from: string; subject: string; fullBody: string }): Promise<EmailMessageRecord> {
    const res = await fetch('/api/emails/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to log email');
    return res.json();
  },

  async applyEmailStatus(emailId: string): Promise<{ success: boolean; application: ApplicationRecord; email: EmailMessageRecord }> {
    const res = await fetch(`/api/emails/${emailId}/apply-status`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to apply email status');
    return res.json();
  },

  // Connectors
  async getConnectors(): Promise<SourceConnector[]> {
    const res = await fetch('/api/connectors');
    if (!res.ok) throw new Error('Failed to fetch connectors');
    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  // Sources & Ingestion Engine (Phase 3 & Dossier Architecture)
  async getSources(primaryOnly: boolean = false): Promise<any[]> {
    const res = await fetch(`/api/sources${primaryOnly ? '?primaryOnly=true' : ''}`);
    if (!res.ok) throw new Error('Failed to fetch source adapters');
    return res.json();
  },

  async getPrimarySources(): Promise<any[]> {
    return this.getSources(true);
  },

  async getApiUsage(): Promise<any[]> {
    const res = await fetch('/api/sources/usage');
    if (!res.ok) throw new Error('Failed to fetch API usage');
    return res.json();
  },

  async triggerDossierDiscovery(options?: { forceExternal?: boolean; sourceIds?: string[] }): Promise<{
    run: any;
    recommendations: Job[];
    totalEvaluated: number;
    queriesUsed: string[];
  }> {
    const res = await fetch('/api/discovery/recommendations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Dossier discovery failed');
    }
    return res.json();
  },

  async getSource(id: string): Promise<any> {
    const res = await fetch(`/api/sources/${id}`);
    if (!res.ok) throw new Error('Failed to fetch source adapter');
    return res.json();
  },

  async testSource(id: string): Promise<{ success: boolean; message: string; details?: any }> {
    const res = await fetch(`/api/sources/${id}/test`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Source connection test failed');
    }
    return res.json();
  },

  async triggerIngestion(options?: { sourceIds?: string[]; criteria?: any }): Promise<{ success: boolean; run: any }> {
    const res = await fetch('/api/ingestion/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ingestion run failed');
    }
    return res.json();
  },

  async getIngestionRuns(limit: number = 20): Promise<any[]> {
    const res = await fetch(`/api/ingestion/runs?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch ingestion runs');
    return res.json();
  },

  async getIngestionRun(id: string): Promise<any> {
    const res = await fetch(`/api/ingestion/runs/${id}`);
    if (!res.ok) throw new Error('Ingestion run not found');
    return res.json();
  },

  async getJobSources(jobId: string): Promise<any[]> {
    const res = await fetch(`/api/jobs/${jobId}/sources`);
    if (!res.ok) throw new Error('Failed to fetch sources for job');
    return res.json();
  },

  async updateJobFreshness(jobId: string, status: string): Promise<Job> {
    const res = await fetch(`/api/jobs/${jobId}/freshness`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update job freshness');
    return res.json();
  },

  // Company Sources (Web-First / ATS Discovery)
  async getCompanies(): Promise<CompanySource[]> {
    const res = await fetch('/api/companies');
    if (!res.ok) throw new Error('Failed to fetch company sources');
    return res.json();
  },

  async addCompany(data: {
    name: string;
    websiteUrl: string;
    careersUrl?: string;
    atsProvider?: string;
    atsSlug?: string;
    crawlFrequencyHours?: number;
  }): Promise<CompanySource> {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to add company source');
    }
    return res.json();
  },

  async updateCompany(id: string, updates: Partial<CompanySource>): Promise<CompanySource> {
    const res = await fetch(`/api/companies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update company source');
    return res.json();
  },

  async deleteCompany(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete company source');
    return res.json();
  },

  async testCompany(id: string): Promise<{
    success: boolean;
    jobs: any[];
    error?: string;
    detectedAts?: any;
    sourceType: string;
  }> {
    const res = await fetch(`/api/companies/${id}/test`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to test company source');
    return res.json();
  },

  async detectAts(url: string): Promise<{
    url: string;
    careersUrl?: string;
    detectedAts?: { provider: string; slug: string; confidence: number };
    jsonLdJobsFound: number;
    title?: string;
  }> {
    const res = await fetch('/api/companies/detect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to inspect URL');
    }
    return res.json();
  },

  async runDiscovery(options?: {
    companyIds?: string[];
    sourceIds?: string[];
    limitCompanies?: number;
  }): Promise<{ run: any; recommendations: Job[] }> {
    const res = await fetch('/api/discovery/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details || err.error || 'Job discovery run failed');
    }
    return res.json();
  },

  async getAtsAdapters(): Promise<Array<{ provider: string; displayName: string; sampleUrlPattern: string }>> {
    const res = await fetch('/api/ats/adapters');
    if (!res.ok) throw new Error('Failed to fetch ATS adapters');
    return res.json();
  },

  async getSourceQuality(): Promise<any> {
    const res = await fetch('/api/sources/quality');
    if (!res.ok) throw new Error('Failed to fetch source quality metrics');
    return res.json();
  },

  // Daily Discoveries & Feed
  async getDailyDiscoveries(params?: Record<string, string>): Promise<DailyDiscoveriesResponse> {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`/api/jobs/daily${query ? `?${query}` : ''}`);
    if (!res.ok) throw new Error('Failed to load daily discoveries feed');
    return res.json();
  },

  // Scheduler API
  async getSchedulerConfig(): Promise<SchedulerState & { isRunning: boolean; formattedNextRunIst: string; formattedLastRunIst: string }> {
    const res = await fetch('/api/scheduler');
    if (!res.ok) throw new Error('Failed to load scheduler configuration');
    return res.json();
  },

  async updateSchedulerConfig(updates: {
    enabled?: boolean;
    scheduleTimeIst?: string;
    intervalHours?: number;
    catchUpEnabled?: boolean;
    intervalMinutes?: number;
  }): Promise<{ message: string; config: any }> {
    const res = await fetch('/api/scheduler/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update scheduler configuration');
    return res.json();
  },

  async runDiscoveryNow(): Promise<{ success: boolean; run: any; config: any }> {
    const res = await fetch('/api/scheduler/run-now', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to trigger discovery run');
    }
    return res.json();
  },

  async toggleCompanyEnabled(id: string, isEnabled?: boolean): Promise<CompanySource> {
    const res = await fetch(`/api/companies/${id}/toggle-enabled`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle source enabled state');
    return res.json();
  },

  async retryCompany(id: string): Promise<any> {
    const res = await fetch(`/api/companies/${id}/retry`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry company source');
    return res.json();
  },

  async retryFailedCompanies(): Promise<any> {
    const res = await fetch('/api/companies/retry-failed', { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry failed company sources');
    return res.json();
  },
};
