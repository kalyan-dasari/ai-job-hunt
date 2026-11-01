import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';

export class LinkedInAdapter extends BaseJobSourceAdapter {
  id = 'linkedin-talent-api';
  source: JobSourceId = 'LinkedIn';
  displayName = 'LinkedIn Talent Solutions & RSC API';
  description = 'Authorized integration via LinkedIn Recruiter System Connect (RSC) and Job Posting API.';

  get status(): SourceStatus {
    return this.isConfigured() ? 'Active' : 'Awaiting Credentials';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'OAuth 2.0',
    rateLimitDescription: '100 requests / day (Developer App default)',
    officialApiDocumentationUrl: 'https://learn.microsoft.com/en-us/linkedin/talent/',
    termsComplianceNote: 'Requires approved LinkedIn Developer Application and Talent Solutions partner contract. Headless scrapers are strictly prohibited by LinkedIn User Agreement Section 8.2.',
  };

  isConfigured(): boolean {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    return !!clientId && !!clientSecret && clientId.length > 5 && clientSecret.length > 5;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'LinkedIn Talent Solutions OAuth credentials not configured. Please supply LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET in .env, or use the manual CSV/JSON dataset ingestion.',
        details: { missingEnv: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'] },
      };
    }

    try {
      const res = await this.fetchWithRetry('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN || ''}`,
        },
      }, 1, 5000);

      if (res.ok) {
        this.lastChecked = new Date().toISOString();
        return {
          success: true,
          message: 'LinkedIn API OAuth handshake verified successfully.',
        };
      }
      return {
        success: false,
        message: `LinkedIn OAuth check returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `LinkedIn gateway error: ${err.message || 'Network unreachable'}`,
      };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'LinkedIn Talent Solutions API credentials required. Please import job exports via CSV/JSON in Data & Sources.',
      };
    }

    try {
      const query = encodeURIComponent(criteria.keywords.join(' '));
      const res = await this.fetchWithRetry(`https://api.linkedin.com/v2/jobSearch?q=${query}&count=${criteria.limit || 20}`, {
        headers: {
          Authorization: `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (!res.ok) {
        return {
          success: false,
          jobs: [],
          error: `LinkedIn API error: HTTP ${res.status}`,
        };
      }

      const data = await res.json();
      const rawJobs: RawSourceJob[] = (data.elements || []).map((el: any) => ({
        externalId: String(el.id),
        title: el.title,
        company: el.companyDetails?.companyName || 'Company',
        location: el.formattedLocation || 'Remote',
        description: el.description?.text || '',
        url: el.applyMethod?.companyApplyUrl || `https://linkedin.com/jobs/view/${el.id}`,
        postedDate: el.listedAt ? new Date(el.listedAt).toISOString().split('T')[0] : undefined,
        sourceName: 'LinkedIn',
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
        error: `LinkedIn fetch failed: ${err.message}`,
      };
    }
  }
}
