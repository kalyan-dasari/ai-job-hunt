import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class AshbyAtsAdapter implements AtsAdapter {
  provider = 'ashby';
  displayName = 'Ashby Job Board';

  buildPublicUrl(slug: string): string {
    return `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const json = await res.json();
        const count = Array.isArray(json?.jobs) ? json.jobs.length : 0;
        return {
          success: true,
          message: `Connected to Ashby board '${slug}' (${count} jobs found).`,
          details: { jobCount: count },
        };
      }
      return {
        success: false,
        message: `Ashby returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Ashby board '${slug}': ${err.message}`,
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
          error: `Ashby API returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobs) ? json.jobs : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const loc = item.location || (item.secondaryLocations && item.secondaryLocations[0]?.location) || 'Not Specified';
        const isRemote = item.isRemote || loc.toLowerCase().includes('remote') || (item.title || '').toLowerCase().includes('remote');
        const desc = item.descriptionPlain || (item.descriptionHtml ? stripHtml(item.descriptionHtml) : '');

        let salaryText: string | undefined = undefined;
        let salaryMin: number | undefined = undefined;
        let salaryMax: number | undefined = undefined;
        let salaryCurrency: string | undefined = undefined;

        if (item.compensation) {
          salaryText = item.compensation.compensationTierSummary;
          if (item.compensation.targetSalary) {
            salaryMin = item.compensation.targetSalary.min;
            salaryMax = item.compensation.targetSalary.max;
            salaryCurrency = item.compensation.targetSalary.currency || 'INR';
          }
        }

        let empType = 'Full-time';
        const rawEmp = (item.employmentType || '').toLowerCase();
        if (rawEmp.includes('intern')) empType = 'Internship';
        else if (rawEmp.includes('part')) empType = 'Part-time';
        else if (rawEmp.includes('contract')) empType = 'Contract';

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title: item.title || 'Software Engineer',
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: empType,
          description: desc,
          salaryText,
          salaryMin,
          salaryMax,
          salaryCurrency,
          url: item.jobUrl || item.applyUrl || `https://jobs.ashbyhq.com/${slug}/${item.id}`,
          canonicalUrl: item.jobUrl,
          postedDate: item.publishedAt || new Date().toISOString(),
          sourceName: 'Ashby',
          rawMetadata: {
            ats: 'ashby',
            slug,
            department: item.department,
            team: item.team,
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
        error: `Ashby fetch error: ${err.message}`,
      };
    }
  }
}

