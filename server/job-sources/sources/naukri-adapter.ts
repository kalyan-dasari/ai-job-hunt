import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';

export class NaukriAdapter extends BaseJobSourceAdapter {
  id = 'naukri-recruiter-api';
  source: JobSourceId = 'Naukri';
  displayName = 'Naukri Enterprise Recruiter API';
  description = 'Direct integration via Info Edge / Naukri RMS Enterprise Partner API.';

  get status(): SourceStatus {
    return this.isConfigured() ? 'Active' : 'Awaiting Credentials';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'API Key',
    rateLimitDescription: '30 requests / min',
    officialApiDocumentationUrl: 'https://recruiter.naukri.com/rms-developer-docs',
    termsComplianceNote: 'Access requires authorized Info Edge Enterprise Recruiter contract and IP whitelisting. Bot scraping prohibited under Naukri Terms of Use.',
  };

  isConfigured(): boolean {
    const key = process.env.NAUKRI_API_KEY;
    return !!key && key.trim().length > 10;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Naukri Enterprise API Key not configured. Please supply NAUKRI_API_KEY in environment or use the manual CSV/JSON ingestion fallback.',
        details: { missingEnv: 'NAUKRI_API_KEY' },
      };
    }

    try {
      const res = await this.fetchWithRetry('https://api.naukri.com/v1/jobs/health', {
        headers: {
          Authorization: `Bearer ${process.env.NAUKRI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }, 1, 5000);

      if (res.ok) {
        this.lastChecked = new Date().toISOString();
        return {
          success: true,
          message: 'Naukri Enterprise API credentials authenticated successfully.',
        };
      }
      return {
        success: false,
        message: `Naukri API authentication failed: HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Naukri endpoint error: ${err.message || 'Network unreachable'}`,
      };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'Naukri Enterprise Recruiter API key required. Use the manual CSV/JSON import fallback in the Data & Sources tab.',
      };
    }

    try {
      const query = encodeURIComponent(criteria.keywords.join(' '));
      const res = await this.fetchWithRetry(`https://api.naukri.com/v1/jobs/search?q=${query}&limit=${criteria.limit || 20}`, {
        headers: {
          Authorization: `Bearer ${process.env.NAUKRI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        return {
          success: false,
          jobs: [],
          error: `Naukri API returned HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawJobs: RawSourceJob[] = (data.jobs || []).map((j: any) => ({
        externalId: j.jobId || String(j.id),
        title: j.title,
        company: j.company,
        location: j.location,
        description: j.description,
        skills: j.skills || [],
        url: j.applyUrl || j.url,
        postedDate: j.createdDate,
        sourceName: 'Naukri',
      }));

      return {
        success: true,
        jobs: rawJobs,
        totalFound: rawJobs.length,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `Naukri fetch failed: ${err.message}`,
      };
    }
  }
}
