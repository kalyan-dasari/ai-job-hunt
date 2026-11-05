import { AtsAdapter, AtsFetchOptions, safeFetchWithRetry, stripHtml } from './types.ts';
import { RawSourceJob, FetchResult } from '../types.ts';

export class RipplingAtsAdapter implements AtsAdapter {
  provider = 'rippling';
  displayName = 'Rippling Job Board';

  buildPublicUrl(slug: string): string {
    return `https://ats.rippling.com/${slug}/jobs`;
  }

  async testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const url = this.buildPublicUrl(slug);
      const res = await safeFetchWithRetry(url, {}, 1, 6000);
      if (res.ok) {
        const html = await res.text();
        const nextDataMatch = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
        let count = 0;
        if (nextDataMatch) {
          try {
            const data = JSON.parse(nextDataMatch[1]);
            const queries = data.props?.pageProps?.dehydratedState?.queries || [];
            const jobQuery = queries.find((q: any) => q.queryKey?.[2] === 'job-posts');
            count = jobQuery?.state?.data?.totalItems || jobQuery?.state?.data?.items?.length || 0;
          } catch {}
        }
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
          error: `Rippling board returned HTTP ${res.status}`,
        };
      }

      const rawJobs: RawSourceJob[] = [];
      const text = await res.text();

      // Check for Next.js SSR dehydrated state in HTML
      const nextDataMatch = text.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/i);
      let items: any[] = [];

      if (nextDataMatch) {
        try {
          const data = JSON.parse(nextDataMatch[1]);
          const queries = data.props?.pageProps?.dehydratedState?.queries || [];
          const jobQuery = queries.find((q: any) => q.queryKey?.[2] === 'job-posts');
          items = jobQuery?.state?.data?.items || [];
        } catch {}
      } else {
        // Fallback: direct JSON response if API was targeted
        try {
          const json = JSON.parse(text);
          items = Array.isArray(json?.jobs) ? json.jobs : (Array.isArray(json) ? json : []);
        } catch {}
      }

      for (const item of items) {
        const title = item.name || item.title || 'Software Engineer';
        const locName = Array.isArray(item.locations) && item.locations[0]?.name
          ? item.locations.map((l: any) => l.name).join(', ')
          : (item.location || 'Not Specified');
        const isRemote = (Array.isArray(item.locations) && item.locations[0]?.workplaceType === 'REMOTE') ||
          item.workplaceType === 'REMOTE' ||
          locName.toLowerCase().includes('remote') ||
          title.toLowerCase().includes('remote');
        const desc = item.description ? stripHtml(item.description) : `${title} at ${companyName}.`;
        const jobUrl = item.url || `https://ats.rippling.com/${slug}/jobs/${item.id}`;

        rawJobs.push({
          externalId: item.id ? String(item.id) : undefined,
          title,
          company: companyName,
          location: locName,
          workArrangement: isRemote ? 'Remote' : 'Hybrid',
          employmentType: item.employmentType || 'Full-time',
          description: desc,
          url: jobUrl,
          canonicalUrl: jobUrl,
          applicationUrl: jobUrl,
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

