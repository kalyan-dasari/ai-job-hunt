import { CompanySource } from '../../../src/types/connector.ts';
import { RawSourceJob, FetchResult } from '../types.ts';
import { safeFetchWithRetry, stripHtml } from '../ats/types.ts';
import { atsDetector } from './ats-detector.ts';
import { jsonLdExtractor } from './jsonld-extractor.ts';
import { feedParser } from './feed-parser.ts';
import { sitemapParser } from './sitemap-parser.ts';
import { getAtsAdapter } from '../ats/index.ts';
import { companySourcesRepository, discoveryAttemptsRepository } from '../../database.ts';

export interface CrawlResult {
  success: boolean;
  jobs: RawSourceJob[];
  detectedAts?: { provider: string; slug: string };
  error?: string;
  sourceType: 'ATS' | 'JSON-LD' | 'RSS' | 'Sitemap' | 'None';
  httpStatus?: number;
  pagesFetched?: number;
}

export class CareerPageCrawler {
  /**
   * Discovers and crawls job opportunities for a company source
   */
  public async crawlCompany(company: CompanySource): Promise<CrawlResult> {
    const targetUrl = company.careersUrl || company.websiteUrl;

    // 1. If company already has known ATS configured, use ATS adapter directly
    if (company.atsProvider && company.atsSlug && company.atsProvider !== 'generic') {
      const adapter = getAtsAdapter(company.atsProvider);
      if (adapter) {
        try {
          const fetchRes = await adapter.fetchJobs(company.atsSlug, company.name);
          companySourcesRepository.recordCrawlResult(company.id, fetchRes.jobs.length, fetchRes.error);
          discoveryAttemptsRepository.record({
            companyId: company.id,
            url: adapter.buildPublicUrl(company.atsSlug),
            status: fetchRes.success ? 'success' : 'failed',
            httpStatus: fetchRes.success ? 200 : 500,
            errorMessage: fetchRes.error,
            jobsFound: fetchRes.jobs.length,
          });

          return {
            success: fetchRes.success,
            jobs: fetchRes.jobs,
            sourceType: 'ATS',
            error: fetchRes.error,
          };
        } catch (err: any) {
          const errMsg = err.message || 'ATS crawl failed';
          companySourcesRepository.recordCrawlResult(company.id, 0, errMsg);
          discoveryAttemptsRepository.record({
            companyId: company.id,
            url: adapter.buildPublicUrl(company.atsSlug),
            status: 'failed',
            errorMessage: errMsg,
            jobsFound: 0,
          });
          return { success: false, jobs: [], sourceType: 'ATS', error: errMsg };
        }
      }
    }

    // 2. Discover careers page & detect ATS or extract structured jobs
    try {
      const pageRes = await safeFetchWithRetry(targetUrl, {}, 2, 8000);
      const httpStatus = pageRes.status;

      if (!pageRes.ok) {
        const errMsg = `HTTP ${httpStatus} fetching ${targetUrl}`;
        companySourcesRepository.recordCrawlResult(company.id, 0, errMsg);
        discoveryAttemptsRepository.record({
          companyId: company.id,
          url: targetUrl,
          status: 'failed',
          httpStatus,
          errorMessage: errMsg,
          jobsFound: 0,
        });
        return { success: false, jobs: [], sourceType: 'None', error: errMsg };
      }

      const html = await pageRes.text();

      // Step A: Check for ATS in URL and HTML content
      const detected = atsDetector.detect(targetUrl, html);
      if (detected) {
        // Save detected ATS to company source record
        companySourcesRepository.update(company.id, {
          atsProvider: detected.provider,
          atsSlug: detected.slug,
        });

        const adapter = getAtsAdapter(detected.provider);
        if (adapter) {
          const fetchRes = await adapter.fetchJobs(detected.slug, company.name);
          companySourcesRepository.recordCrawlResult(company.id, fetchRes.jobs.length, fetchRes.error);
          discoveryAttemptsRepository.record({
            companyId: company.id,
            url: adapter.buildPublicUrl(detected.slug),
            status: fetchRes.success ? 'success' : 'failed',
            httpStatus: 200,
            jobsFound: fetchRes.jobs.length,
            errorMessage: fetchRes.error,
          });

          return {
            success: fetchRes.success,
            jobs: fetchRes.jobs,
            detectedAts: detected,
            sourceType: 'ATS',
            error: fetchRes.error,
          };
        }
      }

      // Step B: Check for JSON-LD JobPosting schema
      const jsonLdJobs = jsonLdExtractor.extract(html, targetUrl, company.name);
      if (jsonLdJobs.length > 0) {
        companySourcesRepository.recordCrawlResult(company.id, jsonLdJobs.length);
        discoveryAttemptsRepository.record({
          companyId: company.id,
          url: targetUrl,
          status: 'success',
          httpStatus: 200,
          jobsFound: jsonLdJobs.length,
        });

        return {
          success: true,
          jobs: jsonLdJobs,
          sourceType: 'JSON-LD',
        };
      }

      // Step C: Check for RSS/Atom feed links in HTML
      const feedLinkMatch = html.match(/<link\b[^>]*type=["']application\/(?:rss\+xml|atom\+xml)["'][^>]*href=["']([^"']+)["']/i);
      if (feedLinkMatch && feedLinkMatch[1]) {
        let feedUrl = feedLinkMatch[1];
        if (!feedUrl.startsWith('http')) {
          feedUrl = new URL(feedUrl, targetUrl).toString();
        }

        try {
          const feedRes = await safeFetchWithRetry(feedUrl, {}, 1, 6000);
          if (feedRes.ok) {
            const xml = await feedRes.text();
            const feedJobs = feedParser.parse(xml, company.name, feedUrl);
            if (feedJobs.length > 0) {
              companySourcesRepository.recordCrawlResult(company.id, feedJobs.length);
              discoveryAttemptsRepository.record({
                companyId: company.id,
                url: feedUrl,
                status: 'success',
                httpStatus: 200,
                jobsFound: feedJobs.length,
              });

              return {
                success: true,
                jobs: feedJobs,
                sourceType: 'RSS',
              };
            }
          }
        } catch {
          // Feed fetch error, proceed to fallback
        }
      }

      // If page was reached but no supported structured postings or ATS could be identified
      companySourcesRepository.recordCrawlResult(company.id, 0, 'No supported ATS or structured JobPosting schema found');
      discoveryAttemptsRepository.record({
        companyId: company.id,
        url: targetUrl,
        status: 'success',
        httpStatus: 200,
        errorMessage: 'Zero structured vacancies detected on page',
        jobsFound: 0,
      });

      return {
        success: true,
        jobs: [],
        sourceType: 'None',
      };
    } catch (err: any) {
      const errMsg = err.message || 'Crawl failed';
      companySourcesRepository.recordCrawlResult(company.id, 0, errMsg);
      discoveryAttemptsRepository.record({
        companyId: company.id,
        url: targetUrl,
        status: 'failed',
        errorMessage: errMsg,
        jobsFound: 0,
      });

      return {
        success: false,
        jobs: [],
        sourceType: 'None',
        error: errMsg,
      };
    }
  }

  /**
   * Helper to inspect any URL, find careers link, and detect ATS without saving
   */
  public async inspectUrl(inputUrl: string): Promise<{
    url: string;
    careersUrl?: string;
    detectedAts?: { provider: string; slug: string; confidence: number };
    jsonLdJobsFound: number;
    title?: string;
  }> {
    const cleanUrl = inputUrl.trim();
    const res = await safeFetchWithRetry(cleanUrl, {}, 2, 8000);
    const html = await res.text();

    const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? stripHtml(titleMatch[1]) : undefined;

    // Detect ATS
    const detected = atsDetector.detect(cleanUrl, html);

    // Check for careers link if this was a homepage
    let careersUrl: string | undefined = undefined;
    const careerLinkRegex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let linkMatch: RegExpExecArray | null;

    while ((linkMatch = careerLinkRegex.exec(html)) !== null) {
      const href = linkMatch[1];
      const text = stripHtml(linkMatch[2]).toLowerCase();
      const hrefLower = href.toLowerCase();

      if (
        hrefLower.includes('/career') ||
        hrefLower.includes('/job') ||
        hrefLower.includes('/opening') ||
        hrefLower.includes('/join-us') ||
        hrefLower.includes('/work-with-us') ||
        text.includes('career') ||
        text.includes('jobs') ||
        text.includes('we are hiring') ||
        text.includes('join us')
      ) {
        try {
          careersUrl = new URL(href, cleanUrl).toString();
          break;
        } catch {}
      }
    }

    const jsonLdJobs = jsonLdExtractor.extract(html, cleanUrl);

    return {
      url: cleanUrl,
      careersUrl: careersUrl || (cleanUrl.toLowerCase().includes('career') || cleanUrl.toLowerCase().includes('job') ? cleanUrl : undefined),
      detectedAts: detected ? { provider: detected.provider, slug: detected.slug, confidence: detected.confidence } : undefined,
      jsonLdJobsFound: jsonLdJobs.length,
      title: pageTitle,
    };
  }
}

export const careerPageCrawler = new CareerPageCrawler();
