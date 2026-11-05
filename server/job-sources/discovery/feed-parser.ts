import { RawSourceJob } from '../types.ts';
import { stripHtml } from '../ats/types.ts';

export class FeedParser {
  /**
   * Parses RSS 2.0 or Atom feed XML into RawSourceJobs
   */
  public parse(xml: string, companyName: string, feedUrl: string): RawSourceJob[] {
    const jobs: RawSourceJob[] = [];

    // 1. Try RSS 2.0 (<item> elements)
    const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    let foundRss = false;

    while ((match = itemRegex.exec(xml)) !== null) {
      foundRss = true;
      const block = match[1];

      const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
      const descMatch = block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i);
      const pubDateMatch = block.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i);
      const guidMatch = block.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);

      const title = titleMatch ? stripHtml(titleMatch[1]) : 'Software Engineer';
      const link = linkMatch ? stripHtml(linkMatch[1]) : feedUrl;
      const desc = descMatch ? stripHtml(descMatch[1]) : '';
      const id = guidMatch ? stripHtml(guidMatch[1]) : undefined;
      const isRemote = title.toLowerCase().includes('remote') || desc.toLowerCase().includes('remote');

      jobs.push({
        externalId: id,
        title,
        company: companyName,
        location: isRemote ? 'Remote (India Eligible)' : 'India',
        workArrangement: isRemote ? 'Remote' : 'Hybrid',
        employmentType: 'Full-time',
        description: desc,
        url: link,
        canonicalUrl: link,
        postedDate: pubDateMatch ? new Date(stripHtml(pubDateMatch[1])).toISOString() : new Date().toISOString(),
        sourceName: 'RSS Feed',
        rawMetadata: {
          feedType: 'RSS 2.0',
          feedUrl,
        },
      });
    }

    if (foundRss && jobs.length > 0) {
      return jobs;
    }

    // 2. Try Atom (<entry> elements)
    const entryRegex = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];

      const titleMatch = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
      const linkHrefMatch = block.match(/<link\b[^>]*href=["']([^"']+)["']/i);
      const linkTagMatch = block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i);
      const contentMatch = block.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i) || block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i);
      const updatedMatch = block.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i) || block.match(/<published\b[^>]*>([\s\S]*?)<\/published>/i);
      const idMatch = block.match(/<id\b[^>]*>([\s\S]*?)<\/id>/i);

      const title = titleMatch ? stripHtml(titleMatch[1]) : 'Software Engineer';
      const link = linkHrefMatch ? linkHrefMatch[1] : linkTagMatch ? stripHtml(linkTagMatch[1]) : feedUrl;
      const desc = contentMatch ? stripHtml(contentMatch[1]) : '';
      const id = idMatch ? stripHtml(idMatch[1]) : undefined;
      const isRemote = title.toLowerCase().includes('remote') || desc.toLowerCase().includes('remote');

      jobs.push({
        externalId: id,
        title,
        company: companyName,
        location: isRemote ? 'Remote (India Eligible)' : 'India',
        workArrangement: isRemote ? 'Remote' : 'Hybrid',
        employmentType: 'Full-time',
        description: desc,
        url: link,
        canonicalUrl: link,
        postedDate: updatedMatch ? new Date(stripHtml(updatedMatch[1])).toISOString() : new Date().toISOString(),
        sourceName: 'RSS Feed',
        rawMetadata: {
          feedType: 'Atom',
          feedUrl,
        },
      });
    }

    return jobs;
  }
}

export const feedParser = new FeedParser();

