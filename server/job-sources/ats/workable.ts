import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class WorkableAtsAdapter implements AtsAdapter {
  provider = 'workable';
  displayName = 'Workable Job Board';

  buildPublicUrl(slug: string): string {
    return `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.jobs) ? json.jobs.length : (json?.total || 0);
        return {
          success: true,
          message: `Connected to Workable board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Workable returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Workable board '${slug}': ${err.message}`,
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
          error: `Workable API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobs) ? json.jobs : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const locParts = [item.location?.city, item.location?.region, item.location?.country].filter(Boolean);
        const loc = locParts.length > 0 ? locParts.join(', ') : 'Not Specified';
        const isRemote = Boolean(item.location?.telecommuting) || loc.toLowerCase().includes('remote') || (item.title || '').toLowerCase().includes('remote');
        const desc = item.description ? stripHtml(item.description) : '';

        rawJobs.push({
          externalId: item.shortcode || item.id ? String(item.shortcode || item.id) : undefined,
          title: item.title || 'Software Engineer',
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.employment_type || 'Full-time',
          description: desc,
          url: item.url || `https://apply.workable.com/${slug}/j/${item.shortcode}/`,
          canonicalUrl: item.url,
          postedDate: item.published_on || item.created_at || new Date().toISOString(),
          sourceName: 'Workable',
          rawMetadata: {
            ats: 'workable',
            slug,
            department: item.department,
            applicationUrl: item.application_url,
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
        error: `Workable fetch error: ${err.message}`,
      };
    }
  }
}
