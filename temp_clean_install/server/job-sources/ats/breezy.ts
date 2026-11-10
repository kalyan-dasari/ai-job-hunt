import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class BreezyAtsAdapter implements AtsAdapter {
  provider = 'breezy';
  displayName = 'Breezy HR Job Board';

  buildPublicUrl(slug: string): string {
    return `https://${slug}.breezy.hr/json`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json) ? json.length : 0;
        return {
          success: true,
          message: `Connected to Breezy HR board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Breezy HR returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Breezy HR board '${slug}': ${err.message}`,
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
          error: `Breezy HR API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json) ? json : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const locName = item.location?.name || 'Not Specified';
        const isRemote = Boolean(item.location?.is_remote) || locName.toLowerCase().includes('remote') || (item.name || '').toLowerCase().includes('remote');
        const desc = item.description ? stripHtml(item.description) : `${item.name} opportunity at ${companyName}.`;

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.name || 'Software Engineer',
          company: companyName,
          location: locName,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.type?.name || 'Full-time',
          description: desc,
          url: item.url || `https://${slug}.breezy.hr/p/${item.id}`,
          canonicalUrl: item.url,
          postedDate: item.creation_date || new Date().toISOString(),
          sourceName: 'Breezy HR',
          rawMetadata: {
            ats: 'breezy',
            slug,
            department: item.department,
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
        error: `Breezy HR fetch error: ${err.message}`,
      };
    }
  }
}

