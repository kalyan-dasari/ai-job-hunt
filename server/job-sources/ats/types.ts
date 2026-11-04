import { RawSourceJob, FetchResult } from '../types.ts';

export const USER_AGENT = 'JobPilotBot/1.0 (+https://github.com/jobpilot; web job discovery engine)';

export interface AtsFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  limit?: number;
}

export interface AtsAdapter {
  provider: string; // 'greenhouse', 'lever', etc.
  displayName: string;
  buildPublicUrl(slug: string): string;
  testConnection(slug: string): Promise<{ success: boolean; message: string; details?: any }>;
  fetchJobs(slug: string, companyName: string, options?: AtsFetchOptions): Promise<FetchResult>;
}

export function stripHtml(html: string = ''): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Safe HTTP fetch with timeout and exponential backoff retry
 */
export async function safeFetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 2,
  timeoutMs: number = 8000
): Promise<Response> {
  let lastError: any = null;

  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/json, application/xml, text/xml, text/html, */*',
    ...(options.headers || {}),
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 429) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error(`Fetch failed for ${url}`);
}
