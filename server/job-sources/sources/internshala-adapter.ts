import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';

export class InternshalaAdapter extends BaseJobSourceAdapter {
  id = 'internshala-partner-feed';
  source: JobSourceId = 'Internshala';
  displayName = 'Internshala Partner & Early Career Feed';
  description = 'Integration for early-career developer roles and internships via authorized employer feed.';

  get status(): SourceStatus {
    return this.isConfigured() ? 'Active' : 'Awaiting Credentials';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'API Key',
    rateLimitDescription: '60 requests / hour',
    officialApiDocumentationUrl: 'https://internshala.com/employer/integrations',
    termsComplianceNote: 'Requires approved Internshala Employer Integration credentials. Automated bot crawling is strictly prohibited under Internshala Terms of Service.',
  };

  isConfigured(): boolean {
    const key = process.env.INTERNSHALA_API_KEY;
    return !!key && key.trim().length > 10;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Internshala Employer API Key not configured. Please supply INTERNSHALA_API_KEY in .env, or use the manual CSV/JSON dataset ingestion.',
        details: { missingEnv: 'INTERNSHALA_API_KEY' },
      };
    }

    try {
      const res = await this.fetchWithRetry('https://internshala.com/api/v1/health', {
        headers: { 'X-API-KEY': process.env.INTERNSHALA_API_KEY || '' },
      }, 1, 5000);

      if (res.ok) {
        this.lastChecked = new Date().toISOString();
        return { success: true, message: 'Internshala Employer API authenticated successfully.' };
      }
      return { success: false, message: `Internshala API returned HTTP ${res.status}` };
    } catch (err: any) {
      return { success: false, message: `Internshala gateway error: ${err.message || 'Offline'}` };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'Internshala Employer API key required. Use the manual CSV/JSON import fallback in Data & Sources.',
      };
    }

    try {
      const query = encodeURIComponent(criteria.keywords.join(' '));
      const res = await this.fetchWithRetry(`https://internshala.com/api/v1/internships?keyword=${query}`, {
        headers: { 'X-API-KEY': process.env.INTERNSHALA_API_KEY || '' },
      });

      if (!res.ok) {
        return { success: false, jobs: [], error: `Internshala error HTTP ${res.status}` };
      }

      const data = await res.json();
      const rawJobs: RawSourceJob[] = (data.internships || []).map((item: any) => ({
        externalId: String(item.id),
        title: item.title,
        company: item.company_name,
        location: item.location || 'India',
        employmentType: 'Internship',
        experienceLevel: 'Intern',
        description: item.description,
        skills: item.skills_required || [],
        salaryText: item.stipend?.salary || 'Undisclosed stipend',
        url: item.url || `https://internshala.com/internship/detail/${item.id}`,
        sourceName: 'Internshala',
      }));

      return { success: true, jobs: rawJobs, totalFound: rawJobs.length };
    } catch (err: any) {
      return { success: false, jobs: [], error: `Internshala fetch failed: ${err.message}` };
    }
  }
}

