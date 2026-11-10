import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class LeverAtsAdapter implements AtsAdapter {
  provider = 'lever';
  displayName = 'Lever Job Board';

  buildPublicUrl(slug: string): string {
    return `https://api.lever.co/v0/postings/${slug}?mode=json`;
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
          message: `Connected to Lever board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Lever returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Lever board '${slug}': ${err.message}`,
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
          error: `Lever API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json) ? json : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const loc = item.categories?.location || 'Not Specified';
        const commitment = item.categories?.commitment || 'Full-time';
        const isRemote = loc.toLowerCase().includes('remote') || (item.text || '').toLowerCase().includes('remote');
        const desc = item.descriptionPlain || (item.description ? stripHtml(item.description) : '');

        let empType = 'Full-time';
        const commLower = commitment.toLowerCase();
        if (commLower.includes('intern')) empType = 'Internship';
        else if (commLower.includes('part')) empType = 'Part-time';
        else if (commLower.includes('contract')) empType = 'Contract';

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.text || 'Software Engineer',
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: empType,
          description: desc,
          url: item.hostedUrl || item.applyUrl || `https://jobs.lever.co/${slug}/${item.id}`,
          canonicalUrl: item.hostedUrl,
          postedDate: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          sourceName: 'Lever',
          rawMetadata: {
            ats: 'lever',
            slug,
            team: item.categories?.team,
            department: item.categories?.department,
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
        error: `Lever fetch error: ${err.message}`,
      };
    }
  }
}

