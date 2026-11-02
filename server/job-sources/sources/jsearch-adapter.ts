import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';
import { apiUsageRepository, queryCacheRepository } from '../../database.ts';

export function normalizeJSearchJob(item: any): RawSourceJob {
  const isRemote = Boolean(item.job_is_remote);
  const city = item.job_city || '';
  const state = item.job_state || '';
  const country = item.job_country || 'India';
  const locationStr = [city, state, country].filter(Boolean).join(', ') || (isRemote ? 'Remote, India' : 'India');

  const noExp = Boolean(item.job_required_experience?.no_experience_required);
  const expMonths = item.job_required_experience?.required_experience_in_months;
  const minYears = noExp ? 0 : expMonths ? Math.round(expMonths / 12) : undefined;
  const expLevel = noExp ? 'Entry' : minYears && minYears >= 5 ? 'Senior' : 'Mid';

  return {
    externalId: item.job_id,
    title: item.job_title || 'Software Engineer',
    company: item.employer_name || 'Employer',
    companyLogo: item.employer_logo || undefined,
    location: locationStr,
    workArrangement: isRemote ? 'Remote' : 'Hybrid',
    employmentType: item.job_employment_type === 'INTERN' ? 'Internship' : 'Full-time',
    experienceLevel: expLevel,
    minExpYears: minYears,
    description: item.job_description || '',
    skills: Array.isArray(item.job_required_skills) ? item.job_required_skills : [],
    responsibilities: Array.isArray(item.job_highlights?.Responsibilities)
      ? item.job_highlights.Responsibilities
      : [],
    salaryMin: item.job_min_salary ? Number(item.job_min_salary) : undefined,
    salaryMax: item.job_max_salary ? Number(item.job_max_salary) : undefined,
    salaryCurrency: item.job_salary_currency || 'INR',
    url: item.job_apply_link || item.job_google_link || 'https://example.com/careers',
    postedDate: item.job_posted_at_datetime_utc || new Date().toISOString(),
    sourceName: 'JSearch',
    rawMetadata: {
      publisher: item.job_publisher,
      employerWebsite: item.employer_website,
      noExperienceRequired: noExp,
    },
  };
}

export class JSearchAdapter extends BaseJobSourceAdapter {
  id = 'jsearch-api';
  source: JobSourceId = 'JSearch';
  displayName = 'JSearch API (Primary Job Aggregator)';
  description = 'Direct real-time job aggregator searching across Indian hubs and verified remote opportunities.';

  get status(): SourceStatus {
    if (!this.isConfigured()) return 'Awaiting Credentials';
    const canRequest = apiUsageRepository.canMakeRequest('jsearch', 200);
    return canRequest ? 'Active' : 'Rate Limited';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'API Key',
    rateLimitDescription: '200 requests / month (Free tier) with search caching & quota enforcement',
    officialApiDocumentationUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
    termsComplianceNote: 'Accesses RapidAPI JSearch endpoints server-side with monthly quota protections and duplicate request suppression.',
  };

  isConfigured(): boolean {
    const key = process.env.JSEARCH_API_KEY;
    return !!key && key.trim().length > 5;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'JSearch API Key not configured. Please supply JSEARCH_API_KEY in .env or environment.',
        details: { missingEnv: 'JSEARCH_API_KEY' },
      };
    }

    try {
      // Check cached test or fetch 1 result
      const cached = queryCacheRepository.get<any>('jsearch', 'test-connection');
      if (cached) {
        return {
          success: true,
          message: 'JSearch API connection active (cached verification).',
          details: { cached: true },
        };
      }

      if (!apiUsageRepository.canMakeRequest('jsearch', 200)) {
        return {
          success: false,
          message: 'JSearch monthly request quota reached (200 requests). Reset on next calendar month.',
        };
      }

      const host = process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com';
      const res = await this.fetchWithRetry(
        'https://jsearch.p.rapidapi.com/search?query=Software%20Engineer%20in%20India&num_pages=1&page=1',
        {
          headers: {
            'x-rapidapi-key': process.env.JSEARCH_API_KEY!,
            'x-rapidapi-host': host,
          },
        },
        1,
        6000
      );

      if (res.ok) {
        apiUsageRepository.recordRequest('jsearch', 200);
        queryCacheRepository.set('jsearch', 'test-connection', { ok: true }, 86400);
        this.lastChecked = new Date().toISOString();
        return {
          success: true,
          message: 'Connected to JSearch API successfully.',
          details: { status: res.status },
        };
      }

      if (res.status === 429) {
        return {
          success: false,
          message: 'JSearch API rate limit or monthly quota exceeded (HTTP 429).',
        };
      }

      return {
        success: false,
        message: `JSearch API returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `JSearch API connection error: ${err.message || 'Offline or network blocked'}`,
      };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'JSearch API is awaiting credentials. Add JSEARCH_API_KEY to enable aggregated live search.',
      };
    }

    // Build targeted query focused on India
    const roleKeyword = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'Software Engineer';
    const locKeyword = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'India';
    const query = `${roleKeyword} in ${locKeyword}`;
    const page = criteria.page || 1;
    const cacheKey = { query, page, country: 'IN' };

    // 1. Check Query Cache to preserve quota
    const cached = queryCacheRepository.get<RawSourceJob[]>('jsearch', cacheKey);
    if (cached && Array.isArray(cached)) {
      this.lastChecked = new Date().toISOString();
      return {
        success: true,
        jobs: cached,
        totalFound: cached.length,
        hasMore: false,
      };
    }

    // 2. Check Monthly Quota
    if (!apiUsageRepository.canMakeRequest('jsearch', 200)) {
      return {
        success: false,
        jobs: [],
        error: 'JSearch monthly quota (200 requests) reached. Ingestion will use cached and local opportunities until reset.',
      };
    }

    try {
      const host = process.env.JSEARCH_API_HOST || 'jsearch.p.rapidapi.com';
      const endpoint = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}&num_pages=1&country=IN`;

      const res = await this.fetchWithRetry(
        endpoint,
        {
          headers: {
            'x-rapidapi-key': process.env.JSEARCH_API_KEY!,
            'x-rapidapi-host': host,
          },
        },
        2,
        8000
      );

      if (!res.ok) {
        if (res.status === 429) {
          return {
            success: false,
            jobs: [],
            error: 'JSearch API rate limit reached (HTTP 429). Please wait for cooldown.',
          };
        }
        return {
          success: false,
          jobs: [],
          error: `JSearch API request returned HTTP ${res.status}`,
        };
      }

      apiUsageRepository.recordRequest('jsearch', 200);
      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        rawJobs.push(normalizeJSearchJob(item));
      }

      // Cache for 24 hours to avoid re-requesting same query
      queryCacheRepository.set('jsearch', cacheKey, rawJobs, 86400);

      this.lastChecked = new Date().toISOString();
      this.activeJobsCount = rawJobs.length;

      return {
        success: true,
        jobs: rawJobs,
        totalFound: rawJobs.length,
        hasMore: items.length >= 10,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `JSearch fetch error: ${err.message || 'Offline or network blocked'}`,
      };
    }
  }
}
