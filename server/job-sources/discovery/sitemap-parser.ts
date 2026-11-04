import { stripHtml } from '../ats/types.ts';

export class SitemapParser {
  /**
   * Parses XML sitemap text and filters for URLs related to jobs/careers
   */
  public parse(xml: string): { url: string; lastMod?: string }[] {
    const results: { url: string; lastMod?: string }[] = [];
    const urlRegex = /<url\b[^>]*>([\s\S]*?)<\/url>/gi;
    let match: RegExpExecArray | null;

    const jobKeywords = ['/job/', '/jobs/', '/career/', '/careers/', '/position/', '/positions/', '/opening/', '/openings/', '/vacancy/', '/vacancies/'];

    while ((match = urlRegex.exec(xml)) !== null) {
      const block = match[1];
      const locMatch = block.match(/<loc\b[^>]*>([\s\S]*?)<\/loc>/i);
      const lastmodMatch = block.match(/<lastmod\b[^>]*>([\s\S]*?)<\/lastmod>/i);

      if (locMatch) {
        const rawUrl = stripHtml(locMatch[1]).trim();
        const urlLower = rawUrl.toLowerCase();

        // Check if URL looks like an individual job posting
        const isJobUrl = jobKeywords.some((kw) => urlLower.includes(kw)) &&
          !urlLower.endsWith('/jobs') &&
          !urlLower.endsWith('/careers') &&
          !urlLower.endsWith('/openings');

        if (isJobUrl) {
          results.push({
            url: rawUrl,
            lastMod: lastmodMatch ? stripHtml(lastmodMatch[1]).trim() : undefined,
          });
        }
      }
    }

    return results;
  }
}

export const sitemapParser = new SitemapParser();
