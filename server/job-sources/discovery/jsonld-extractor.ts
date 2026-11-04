import { RawSourceJob } from '../types.ts';
import { stripHtml } from '../ats/types.ts';

export class JsonLdExtractor {
  /**
   * Extracts schema.org JobPosting objects from HTML page contents.
   */
  public extract(html: string, pageUrl: string, fallbackCompany: string = 'Employer'): RawSourceJob[] {
    const jobs: RawSourceJob[] = [];
    const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = scriptRegex.exec(html)) !== null) {
      const jsonContent = match[1].trim();
      if (!jsonContent) continue;

      try {
        const parsed = JSON.parse(jsonContent);
        const postings = this.findJobPostings(parsed);

        for (const item of postings) {
          const job = this.normalizeJobPosting(item, pageUrl, fallbackCompany);
          if (job) jobs.push(job);
        }
      } catch {
        // Continue searching other script tags if one contains invalid JSON
      }
    }

    return jobs;
  }

  private findJobPostings(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.flatMap((item) => this.findJobPostings(item));
    }
    if (typeof data === 'object') {
      const type = data['@type'];
      if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
        return [data];
      }
      if (data['@graph'] && Array.isArray(data['@graph'])) {
        return data['@graph'].filter((item: any) => {
          const gType = item?.['@type'];
          return gType === 'JobPosting' || (Array.isArray(gType) && gType.includes('JobPosting'));
        });
      }
    }
    return [];
  }

  private normalizeJobPosting(data: any, pageUrl: string, fallbackCompany: string): RawSourceJob | null {
    const title = data.title || data.name;
    if (!title) return null;

    const company = data.hiringOrganization?.name || fallbackCompany;
    const desc = data.description ? stripHtml(data.description) : `${title} at ${company}.`;

    // Location extraction
    let loc = 'Not Specified';
    let isRemote = false;

    if (data.jobLocationType === 'TELECOMMUTE' || data.applicantLocationRequirements) {
      isRemote = true;
      loc = 'Remote (India Eligible)';
    }

    if (data.jobLocation) {
      const addr = data.jobLocation.address;
      if (addr) {
        if (typeof addr === 'string') {
          loc = addr;
        } else {
          const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
          if (parts.length > 0) loc = parts.join(', ');
        }
      }
    }

    if (loc.toLowerCase().includes('remote') || title.toLowerCase().includes('remote')) {
      isRemote = true;
    }

    // Salary extraction
    let salaryMin: number | undefined;
    let salaryMax: number | undefined;
    let salaryCurrency: string | undefined;

    if (data.baseSalary) {
      salaryCurrency = data.baseSalary.currency || 'INR';
      const val = data.baseSalary.value;
      if (val) {
        if (typeof val === 'number') {
          salaryMin = val;
        } else if (typeof val === 'object') {
          salaryMin = val.minValue != null ? Number(val.minValue) : undefined;
          salaryMax = val.maxValue != null ? Number(val.maxValue) : undefined;
        }
      }
    }

    const jobUrl = data.url || data.directApply || pageUrl;

    return {
      externalId: data.identifier?.value ? String(data.identifier.value) : undefined,
      title,
      company,
      location: loc,
      workArrangement: isRemote ? 'Remote' : 'Hybrid',
      employmentType: typeof data.employmentType === 'string' ? data.employmentType : 'Full-time',
      description: desc,
      salaryMin,
      salaryMax,
      salaryCurrency,
      url: jobUrl,
      canonicalUrl: jobUrl,
      postedDate: data.datePosted || new Date().toISOString(),
      expiryDate: data.validThrough || undefined,
      sourceName: 'JSON-LD',
      rawMetadata: {
        schemaType: 'JobPosting',
        industry: data.industry,
      },
    };
  }
}

export const jsonLdExtractor = new JsonLdExtractor();
