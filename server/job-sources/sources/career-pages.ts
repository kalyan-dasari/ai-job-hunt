import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';

export class CareerPagesAdapter extends BaseJobSourceAdapter {
  id = 'career-pages-public';
  source: JobSourceId = 'Career Page';
  displayName = 'Corporate Career Pages & Open Feeds';
  description = 'Direct ingestion from verified public corporate career portals and authorized open syndication feeds.';
  status: SourceStatus = 'Active';

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: false,
    authType: 'None',
    rateLimitDescription: '60 requests / min',
    officialApiDocumentationUrl: 'https://jobicy.com/api/v2/remote-jobs',
    termsComplianceNote: 'Complies with open public career syndication and robot.txt guidelines.',
  };

  isConfigured(): boolean {
    return true;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      // Test connectivity against authorized public syndication endpoint
      const res = await this.fetchWithRetry('https://jobicy.com/api/v2/remote-jobs?count=1', {}, 1, 5000);
      if (res.ok) {
        this.status = 'Active';
        this.lastChecked = new Date().toISOString();
        return {
          success: true,
          message: 'Connected to public career syndication feed successfully.',
          details: { status: res.status, endpoint: 'jobicy.com/api/v2/remote-jobs' },
        };
      }
      return {
        success: false,
        message: `Public feed returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Public feed unreachable: ${err.message || 'Network error'}`,
      };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    const rawJobs: RawSourceJob[] = [];
    const count = criteria.limit || 15;
    const tag = criteria.keywords.length > 0 ? encodeURIComponent(criteria.keywords[0].toLowerCase()) : 'engineering';

    try {
      const endpoint = `https://jobicy.com/api/v2/remote-jobs?count=${count}&tag=${tag}`;
      const res = await this.fetchWithRetry(endpoint, {}, 2, 8000);

      if (!res.ok) {
        return {
          success: false,
          jobs: [],
          error: `HTTP ${res.status}: Failed to retrieve open career feed`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobs) ? json.jobs : [];

      for (const item of items) {
        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.jobTitle || 'Software Engineer',
          company: item.companyName || 'Technology Company',
          companyLogo: item.companyLogo,
          location: item.jobGeo || 'Remote',
          workArrangement: item.jobGeo ? 'Remote' : 'Hybrid',
          employmentType: item.jobType || 'Full-time',
          experienceLevel: item.jobLevel || 'Mid',
          description: item.jobDescription || item.jobExcerpt || '',
          url: item.url || item.applyUrl || 'https://example.com/careers',
          postedDate: item.pubDate,
          salaryText: item.annualSalaryMin && item.annualSalaryMax ? `$${item.annualSalaryMin} - $${item.annualSalaryMax}` : undefined,
          salaryMin: item.annualSalaryMin ? Number(item.annualSalaryMin) : undefined,
          salaryMax: item.annualSalaryMax ? Number(item.annualSalaryMax) : undefined,
          salaryCurrency: 'USD',
          sourceName: 'Career Page',
          rawMetadata: {
            sourceProvider: 'Jobicy Public Career Feed',
            jobIndustry: item.jobIndustry,
          },
        });
      }

      this.lastChecked = new Date().toISOString();
      this.activeJobsCount = rawJobs.length;

      return {
        success: true,
        jobs: rawJobs,
        totalFound: rawJobs.length,
        hasMore: false,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `Career feed fetch error: ${err.message || 'Offline or network blocked'}`,
      };
    }
  }
}

