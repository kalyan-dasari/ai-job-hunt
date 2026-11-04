import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class TeamtailorAtsAdapter implements AtsAdapter {
  provider = 'teamtailor';
  displayName = 'Teamtailor Job Feed';

  buildPublicUrl(slug: string): string {
    return `https://${slug}.teamtailor.com/jobs.rss`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/<item>/g) || [];
        return {
          success: true,
          message: `Connected to Teamtailor RSS feed '${slug}' (${matches.length} jobs found).`,
          details: { jobCount: matches.length },
        };
      }
      return {
        success: false,
        message: `Teamtailor returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Teamtailor feed '${slug}': ${err.message}`,
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
          error: `Teamtailor RSS returned HTTP ${res.status}`,
        };
      }

      const xmlText = await res.text();
      const rawJobs: RawSourceJob[] = [];

      const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
      let match: RegExpExecArray | null;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const block = match[1];

        const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
        const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
        const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);

        const title = titleMatch ? stripHtml(titleMatch[1]) : 'Software Engineer';
        const link = linkMatch ? stripHtml(linkMatch[1]) : `https://${slug}.teamtailor.com/jobs`;
        const desc = descMatch ? stripHtml(descMatch[1]) : '';
        const id = guidMatch ? stripHtml(guidMatch[1]) : undefined;
        const isRemote = title.toLowerCase().includes('remote') || desc.toLowerCase().includes('remote');

        rawJobs.push({
          externalId: id,
          title,
          company: companyName,
          location: isRemote ? 'Remote' : 'India',
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: 'Full-time',
          description: desc,
          url: link,
          canonicalUrl: link,
          postedDate: pubDateMatch ? new Date(stripHtml(pubDateMatch[1])).toISOString() : new Date().toISOString(),
          sourceName: 'Teamtailor',
          rawMetadata: {
            ats: 'teamtailor',
            slug,
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
        error: `Teamtailor fetch error: ${err.message}`,
      };
    }
  }
}
