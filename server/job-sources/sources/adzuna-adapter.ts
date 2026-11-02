import { BaseJobSourceAdapter } from './base-adapter.ts';
import { JobSourceId, SourceStatus, SourceCapability, FetchCriteria, FetchResult, RawSourceJob } from '../types.ts';
import { apiUsageRepository, queryCacheRepository } from '../../database.ts';

function stripHtml(html: string = ''): string {
  return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
}

export function normalizeAdzunaJob(item: any): RawSourceJob {
  const cleanTitle = stripHtml(item.title);
  const cleanDesc = stripHtml(item.description);
  const locationName = item.location?.display_name || (Array.isArray(item.location?.area) ? item.location.area.join(', ') : 'India');
  const isRemote = locationName.toLowerCase().includes('remote') || cleanTitle.toLowerCase().includes('remote');

  const isIntern = cleanTitle.toLowerCase().includes('intern') || cleanTitle.toLowerCase().includes('trainee');
  const isSenior = cleanTitle.toLowerCase().includes('senior') || cleanTitle.toLowerCase().includes('lead');
  const isEntry = isIntern || cleanTitle.toLowerCase().includes('fresher') || cleanTitle.toLowerCase().includes('entry') || cleanTitle.toLowerCase().includes('junior');

  const expLevel = isIntern ? 'Intern' : isEntry ? 'Entry' : isSenior ? 'Senior' : 'Mid';
  const minYears = isIntern || isEntry ? 0 : isSenior ? 5 : 2;

  return {
    externalId: item.id ? String(item.id) : undefined,
    title: cleanTitle || 'Software Engineer',
    company: item.company?.display_name ? stripHtml(item.company.display_name) : 'Employer',
    location: locationName,
    workArrangement: isRemote ? 'Remote' : 'Hybrid',
    employmentType: isIntern ? 'Internship' : item.contract_time === 'part_time' ? 'Part-time' : item.contract_type === 'contract' ? 'Contract' : 'Full-time',
    experienceLevel: expLevel,
    minExpYears: minYears,
    description: cleanDesc,
    salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
    salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
    salaryCurrency: 'INR',
    salaryText: item.salary_min && item.salary_max ? `₹${item.salary_min.toLocaleString()} - ₹${item.salary_max.toLocaleString()}` : undefined,
    url: item.redirect_url || 'https://www.adzuna.in',
    postedDate: item.created || new Date().toISOString(),
    sourceName: 'Adzuna',
    rawMetadata: {
      category: item.category?.label,
      attribution: 'Jobs provided by Adzuna (India)',
    },
  };
}

export class AdzunaAdapter extends BaseJobSourceAdapter {
  id = 'adzuna-api';
  source: JobSourceId = 'Adzuna';
  displayName = 'Adzuna API (Secondary Job Aggregator)';
  description = 'Aggregated job search indexing verified corporate and tech listings across India.';

  get status(): SourceStatus {
    if (!this.isConfigured()) return 'Awaiting Credentials';
    const canRequest = apiUsageRepository.canMakeRequest('adzuna', 250);
    return canRequest ? 'Active' : 'Rate Limited';
  }

  capabilities: SourceCapability = {
    supportsSearch: true,
    supportsPagination: true,
    supportsLocationFilter: true,
    requiresAuthentication: true,
    authType: 'API Key',
    rateLimitDescription: '250 requests / month with query caching & quota guard',
    officialApiDocumentationUrl: 'https://developer.adzuna.com/',
    termsComplianceNote: 'Accesses official Adzuna India endpoint with attribution preserved and rate-limiting protections.',
  };

  isConfigured(): boolean {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    return !!appId && !!appKey && appId.trim().length > 2 && appKey.trim().length > 5;
  }

  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: 'Adzuna API credentials not configured. Please supply ADZUNA_APP_ID and ADZUNA_APP_KEY in .env.',
        details: { missingEnv: 'ADZUNA_APP_ID, ADZUNA_APP_KEY' },
      };
    }

    try {
      const cached = queryCacheRepository.get<any>('adzuna', 'test-connection');
      if (cached) {
        return {
          success: true,
          message: 'Adzuna API connection active (cached verification).',
          details: { cached: true },
        };
      }

      if (!apiUsageRepository.canMakeRequest('adzuna', 250)) {
        return {
          success: false,
          message: 'Adzuna monthly request quota reached (250 requests). Reset on next calendar month.',
        };
      }

      const endpoint = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=1&what=developer&content-type=application/json`;
      const res = await this.fetchWithRetry(endpoint, {}, 1, 6000);

      if (res.ok) {
        apiUsageRepository.recordRequest('adzuna', 250);
        queryCacheRepository.set('adzuna', 'test-connection', { ok: true }, 86400);
        this.lastChecked = new Date().toISOString();
        return {
          success: true,
          message: 'Connected to Adzuna India API successfully.',
          details: { status: res.status },
        };
      }

      if (res.status === 429) {
        return {
          success: false,
          message: 'Adzuna API rate limit exceeded (HTTP 429).',
        };
      }

      return {
        success: false,
        message: `Adzuna API returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Adzuna API connection error: ${err.message || 'Offline or network blocked'}`,
      };
    }
  }

  async fetchJobs(criteria: FetchCriteria): Promise<FetchResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        jobs: [],
        error: 'Adzuna API is awaiting credentials. Add ADZUNA_APP_ID and ADZUNA_APP_KEY to enable search.',
      };
    }

    const what = criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords[0] : 'Software Engineer';
    const where = criteria.locations && criteria.locations.length > 0 ? criteria.locations[0] : 'India';
    const page = criteria.page || 1;
    const limit = Math.min(criteria.limit || 15, 20);
    const cacheKey = { what, where, page, country: 'in' };

    // 1. Check Query Cache
    const cached = queryCacheRepository.get<RawSourceJob[]>('adzuna', cacheKey);
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
    if (!apiUsageRepository.canMakeRequest('adzuna', 250)) {
      return {
        success: false,
        jobs: [],
        error: 'Adzuna monthly quota (250 requests) reached. Ingestion will use cached and local opportunities until reset.',
      };
    }

    try {
      const endpoint = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=${limit}&what=${encodeURIComponent(what)}&where=${encodeURIComponent(where)}&content-type=application/json`;

      const res = await this.fetchWithRetry(endpoint, {}, 2, 8000);

      if (!res.ok) {
        if (res.status === 429) {
          return {
            success: false,
            jobs: [],
            error: 'Adzuna API rate limit reached (HTTP 429). Cooling down.',
          };
        }
        return {
          success: false,
          jobs: [],
          error: `Adzuna API request returned HTTP ${res.status}`,
        };
      }

      apiUsageRepository.recordRequest('adzuna', 250);
      const json = await res.json();
      const items = Array.isArray(json?.results) ? json.results : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        rawJobs.push(normalizeAdzunaJob(item));
      }

      // Cache for 24 hours
      queryCacheRepository.set('adzuna', cacheKey, rawJobs, 86400);

      this.lastChecked = new Date().toISOString();
      this.activeJobsCount = rawJobs.length;

      return {
        success: true,
        jobs: rawJobs,
        totalFound: Number(json?.count || rawJobs.length),
        hasMore: items.length >= limit,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `Adzuna fetch error: ${err.message || 'Offline or network blocked'}`,
      };
    }
  }
}
