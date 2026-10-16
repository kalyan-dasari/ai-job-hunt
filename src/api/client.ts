import { Job, VerificationReport, MatchResult } from '../types/job';
import { CandidateProfile } from '../types/candidate';
import { ApplicationRecord, EmailMessageRecord, NotificationItem, PreparedMaterials } from '../types/application';
import { SourceConnector } from '../types/connector';

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
};
