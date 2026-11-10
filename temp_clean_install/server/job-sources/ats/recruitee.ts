import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class RecruiteeAtsAdapter implements AtsAdapter {
  provider = 'recruitee';
  displayName = 'Recruitee Job Board';

  buildPublicUrl(slug: string): string {
    return `https://${slug}.recruitee.com/api/offers/`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.offers) ? json.offers.length : 0;
        return {
          success: true,
          message: `Connected to Recruitee board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Recruitee returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Recruitee board '${slug}': ${err.message}`,
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
          error: `Recruitee API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.offers) ? json.offers : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const locParts = [item.location, item.city, item.country].filter(Boolean);
        const loc = locParts.length > 0 ? locParts.join(', ') : 'Not Specified';
        const isRemote = Boolean(item.remote) || loc.toLowerCase().includes('remote') || (item.title || '').toLowerCase().includes('remote');
        const desc = item.description ? stripHtml(item.description) : '';

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.title || 'Software Engineer',
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.employment_type_code === 'part_time' ? 'Part-time' : item.employment_type_code === 'internship' ? 'Internship' : 'Full-time',
          description: desc,
          url: item.careers_url || `https://${slug}.recruitee.com/o/${item.slug || item.id}`,
          canonicalUrl: item.careers_url,
          postedDate: item.created_at || new Date().toISOString(),
          sourceName: 'Recruitee',
          rawMetadata: {
            ats: 'recruitee',
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
        error: `Recruitee fetch error: ${err.message}`,
      };
    }
  }
}

