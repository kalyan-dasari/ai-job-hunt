import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class PersonioAtsAdapter implements AtsAdapter {
  provider = 'personio';
  displayName = 'Personio Job Feed';

  buildPublicUrl(slug: string): string {
    return `https://${slug}.jobs.personio.de/xml`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const text = await res.text();
        const matches = text.match(/<position>/g) || [];
        return {
          success: true,
          message: `Connected to Personio feed '${slug}' (${matches.length} positions found).`,
          details: { jobCount: matches.length },
        };
      }
      return {
        success: false,
        message: `Personio returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Personio feed '${slug}': ${err.message}`,
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
          error: `Personio feed returned HTTP ${res.status}`,
        };
      }

      const xmlText = await res.text();
      const rawJobs: RawSourceJob[] = [];

      // Extract each <position> block using regex
      const positionRegex = /<position>([\s\S]*?)<\/position>/gi;
      let match: RegExpExecArray | null;

      while ((match = positionRegex.exec(xmlText)) !== null) {
        const block = match[1];

        const idMatch = block.match(/<id>([\s\S]*?)<\/id>/i);
        const nameMatch = block.match(/<name>([\s\S]*?)<\/name>/i);
        const officeMatch = block.match(/<office>([\s\S]*?)<\/office>/i);
        const deptMatch = block.match(/<department>([\s\S]*?)<\/department>/i);
        const scheduleMatch = block.match(/<schedule>([\s\S]*?)<\/schedule>/i);
        const descMatch = block.match(/<value>([\s\S]*?)<\/value>/i) || block.match(/<jobDescription>([\s\S]*?)<\/jobDescription>/i);
        const createdAtMatch = block.match(/<createdAt>([\s\S]*?)<\/createdAt>/i);

        const id = idMatch ? stripHtml(idMatch[1]) : undefined;
        const title = nameMatch ? stripHtml(nameMatch[1]) : 'Software Engineer';
        const office = officeMatch ? stripHtml(officeMatch[1]) : 'Not Specified';
        const isRemote = office.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');
        const desc = descMatch ? stripHtml(descMatch[1]) : '';
        const schedule = scheduleMatch ? stripHtml(scheduleMatch[1]) : 'full-time';

        const jobUrl = id ? `https://${slug}.jobs.personio.de/job/${id}` : `https://${slug}.jobs.personio.de/`;

        rawJobs.push({
          externalId: id,
          title,
          company: companyName,
          location: office,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: schedule.includes('part') ? 'Part-time' : 'Full-time',
          description: desc,
          url: jobUrl,
          canonicalUrl: jobUrl,
          postedDate: createdAtMatch ? stripHtml(createdAtMatch[1]) : new Date().toISOString(),
          sourceName: 'Personio',
          rawMetadata: {
            ats: 'personio',
            slug,
            department: deptMatch ? stripHtml(deptMatch[1]) : undefined,
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
        error: `Personio fetch error: ${err.message}`,
      };
    }
  }
}
