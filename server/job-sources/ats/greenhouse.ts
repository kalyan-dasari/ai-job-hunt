import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class GreenhouseAtsAdapter implements AtsAdapter {
  provider = 'greenhouse';
  displayName = 'Greenhouse Job Board';

  buildPublicUrl(slug: string): string {
    return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`;
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.jobs) ? json.jobs.length : 0;
        return {
          success: true,
          message: `Connected to Greenhouse board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Greenhouse returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Greenhouse board '${slug}': ${err.message}`,
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
          error: `Greenhouse API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobs) ? json.jobs : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const locName = item.location?.name || (item.offices && item.offices[0]?.name) || 'Not Specified';
        const isRemote = locName.toLowerCase().includes('remote') || item.title.toLowerCase().includes('remote');
        const descHtml = item.content ? stripHtml(item.content) : '';

        // Extract departments / teams
        const dept = item.departments && item.departments[0] ? item.departments[0].name : undefined;

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.title || 'Software Engineer',
          company: companyName,
          location: locName,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: 'Full-time',
          description: descHtml,
          url: item.absolute_url || `https://boards.greenhouse.io/${slug}/jobs/${item.id}`,
          canonicalUrl: item.absolute_url,
          postedDate: item.updated_at || new Date().toISOString(),
          sourceName: 'Greenhouse',
          rawMetadata: {
            ats: 'greenhouse',
            slug,
            department: dept,
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
        error: `Greenhouse fetch error: ${err.message}`,
      };
    }
  }
}
