import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';

export class FounditAdapter extends BaseJobSourceAdapter {
  id = 'foundit-recruiter-api';
  source: JobSourceId = 'Foundit';
  displayName = 'Foundit (formerly Monster) Enterprise API';
  description = 'Direct integration via Foundit Employer / Recruiter Syndication API.';

  get status(): SourceStatus {
    return this.isConfigured() ? 'Active' : 'Awaiting Credentials';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'API Key',
    rateLimitDescription: '45 requests / min',
    officialApiDocumentationUrl: 'https://www.foundit.in/recruiter/developer',
    termsComplianceNote: 'Requires authorized Foundit Recruiter Client credentials. Bot scraping violates Foundit terms of service.',
  };

  isConfigured(): boolean {
    const key = process.env.FOUNDIT_API_KEY;
    return !!key && key.trim().length > 10;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Foundit API Key not configured. Please supply FOUNDIT_API_KEY in .env, or use the manual CSV/JSON dataset ingestion.',
        details: { missingEnv: 'FOUNDIT_API_KEY' },
      };
    }

    try {
      const res = await this.fetchWithRetry('https://api.foundit.in/v1/health', {
        headers: { 'Authorization': `Bearer ${process.env.FOUNDIT_API_KEY}` },
      }, 1, 5000);

      if (res.ok) {
        this.lastChecked = new Date().toISOString();
        return { success: true, message: 'Foundit Recruiter API authenticated successfully.' };
      }
      return { success: false, message: `Foundit API returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Foundit endpoint error: ${err.message || 'Offline'}` };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'Foundit API key required. Use the manual CSV/JSON import fallback in Data & Sources.',
      };
    }

    try {
      const query = encodeURIComponent(criteria.keywords.join(' '));
      const res = await this.fetchWithRetry(`https://api.foundit.in/v1/jobs?query=${query}`, {
        headers: { 'Authorization': `Bearer ${process.env.FOUNDIT_API_KEY}` },
      });

      if (!res.ok) {
        return { success: false, jobs: [], error: `Foundit error HTTP ${res.status}` };
      }

      const data = await res.json();
      const rawJobs: RawSourceJob[] = (data.jobListings || []).map((j: any) => ({
        externalId: String(j.jobId || j.id),
        title: j.title,
        company: j.companyName,
        location: j.locations?.[0] || 'India',
        description: j.jobDescription,
        skills: j.skills || [],
        url: j.redirectUrl || `https://www.foundit.in/job/${j.jobId}`,
        sourceName: 'Foundit',
      }));

      return { success: true, jobs: rawJobs, totalFound: rawJobs.length };
    } catch (err: any) {
      return { success: false, jobs: [], error: `Foundit fetch failed: ${err.message}` };
    }
  }
}

