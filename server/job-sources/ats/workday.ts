import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class WorkdayAtsAdapter implements AtsAdapter {
  provider = 'workday';
  displayName = 'Workday Career Site';

  private parseSlug(slug: string): { tenant: string; careerSite: string } {
    const parts = slug.split('/');
    if (parts.length >= 2) {
      return { tenant: parts[0], careerSite: parts[1] };
    }
    return { tenant: slug, careerSite: slug };
  }

  buildPublicUrl(slug: string): string {
    const { tenant, careerSite } = this.parseSlug(slug);
    return `https://${tenant}.wd1.myworkdayjobs.com/wday/cxs/${tenant}/${careerSite}/jobs`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: '' }),
        },
        1,
        6000
      );

      if (res.ok) {
        const json = await res.json();
        const count = json?.total || (Array.isArray(json?.jobPostings) ? json.jobPostings.length : 0);
        return {
          success: true,
          message: `Connected to Workday career site '${slug}' (${count} jobs found).`,
          details: { totalJobs: count },
        };
      }
      return {
        success: false,
        message: `Workday returned HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to connect to Workday site '${slug}': ${err.message}`,
      };
    }
  }

  async fetchJobs(slug: string, companyName: string, options: AtsFetchOptions = {}): Promise<FetchResult> {
    try {
      const { tenant, careerSite } = this.parseSlug(slug);
      const url = this.buildPublicUrl(slug);
      const limit = options.limit || 20;

      const res = await safeFetchWithRetry(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit, offset: 0, searchText: '' }),
        },
        options.maxRetries ?? 2,
        options.timeoutMs ?? 10000
      );

      if (!res.ok) {
        return {
          success: false,
          jobs: [],
          error: `Workday CXS returned HTTP ${res.status}`,
        };
      }

      const json = await res.json();
      const items = Array.isArray(json?.jobPostings) ? json.jobPostings : [];
      const rawJobs: RawSourceJob[] = [];

      for (const item of items) {
        const title = item.title || 'Software Engineer';
        const loc = item.locationsText || 'India';
        const isRemote = loc.toLowerCase().includes('remote') || title.toLowerCase().includes('remote');
        const extPath = item.externalPath || '';
        const jobUrl = extPath
          ? `https://${tenant}.wd1.myworkdayjobs.com/en-US/${careerSite}${extPath}`
          : `https://${tenant}.wd1.myworkdayjobs.com/${careerSite}`;

        rawJobs.push({
          externalId: extPath || item.bulletFields?.[0] || undefined,
          title,
          company: companyName,
          location: loc,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: 'Full-time',
          description: `${title} role at ${companyName}. Location: ${loc}. Posted: ${item.postedOn || 'Recently'}.`,
          url: jobUrl,
          canonicalUrl: jobUrl,
          postedDate: new Date().toISOString(),
          sourceName: 'Workday',
          rawMetadata: {
            ats: 'workday',
            tenant,
            careerSite,
            postedOn: item.postedOn,
          },
        });
      }

      return {
        success: true,
        jobs: rawJobs,
        totalFound: json?.total || rawJobs.length,
      };
    } catch (err: any) {
      return {
        success: false,
        jobs: [],
        error: `Workday fetch error: ${err.message}`,
      };
    }
  }
}
