import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class SmartRecruitersAtsAdapter implements AtsAdapter {
  provider = 'smartrecruiters';
  displayName = 'SmartRecruiters Job Board';

  buildPublicUrl(slug: string): string {
    return `https://api.smartrecruiters.com/v1/companies/${slug}/postings`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.content) ? json.content.length : (json?.totalFound || 0);
        return {
          success: true,
          message: `Connected to SmartRecruiters board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `SmartRecruiters returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to SmartRecruiters board '${slug}': ${err.message}`,
      };
    }
  }

  async fetchJobs(slug: string, companyName: string, options: AtsFetchOptions = {}): Promise<FetchResult> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, options.maxRetries ?? 2, options.timeoutMs ?? 10000);

      if (!res.ok) {
        return {
          success: false,
          jobs: [],
          error: `SmartRecruiters API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.content) ? json.content : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const locParts = [item.location?.city, item.location?.region, item.location?.country].filter(Boolean);
        const loc = locParts.length > 0 ? locParts.join(', ') : 'Not Specified';
        const isRemote = Boolean(item.location?.remote) || loc.toLowerCase().includes('remote') || (item.name || '').toLowerCase().includes('remote');

        const jobUrl = `https://jobs.smartrecruiters.com/${slug}/${item.id}`;

        rawJobs.push({
          externalId: item.id || item.uuid ? String(item.id || item.uuid) : undefined,
          title: item.name || 'Software Engineer',
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.typeOfEmployment?.label || 'Full-time',
          description: `${item.name} at ${companyName}. Department: ${item.department?.label || 'Engineering'}.`,
          url: jobUrl,
          canonicalUrl: jobUrl,
          postedDate: item.releasedDate || new Date().toISOString(),
          sourceName: 'SmartRecruiters',
          rawMetadata: {
            ats: 'smartrecruiters',
            slug,
            refNumber: item.refNumber,
            department: item.department?.label,
          },
        });
      }

      return {
        success: true,
        jobs: rawJobs,
        totalFound: rawJobs.length,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `SmartRecruiters fetch error: ${err.message}`,
      };
    }
  }
}
