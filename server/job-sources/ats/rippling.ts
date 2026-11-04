import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class RipplingAtsAdapter implements AtsAdapter {
  provider = 'rippling';
  displayName = 'Rippling Job Board';

  buildPublicUrl(slug: string): string {
    return `https://api.rippling.com/platform/api/ats/v1/board/${slug}/jobs`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.jobs) ? json.jobs.length : (Array.isArray(json) ? json.length : 0);
        return {
          success: true,
          message: `Connected to Rippling board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Rippling returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Rippling board '${slug}': ${err.message}`,
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
          error: `Rippling API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobs) ? json.jobs : (Array.isArray(json) ? json : []);
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const title = item.name || item.title || 'Software Engineer';
        const locName = Array.isArray(item.locations) && item.locations[0]?.name
          ? item.locations.map((l: any) => l.name).join(', ')
          : (item.location || 'Not Specified');
        const isRemote = item.workplaceType === 'REMOTE' || locName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');
        const desc = item.description ? stripHtml(item.description) : `${title} at ${companyName}.`;

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title,
          company: companyName,
          location: locName,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.employmentType || 'Full-time',
          description: desc,
          url: item.url || `https://ats.rippling.com/${slug}/jobs/${item.id}`,
          canonicalUrl: item.url,
          postedDate: item.updatedAt || item.createdAt || new Date().toISOString(),
          sourceName: 'Rippling',
          rawMetadata: {
            ats: 'rippling',
            slug,
            department: item.department?.name || item.department,
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
        error: `Rippling fetch error: ${err.message}`,
      };
    }
  }
}
