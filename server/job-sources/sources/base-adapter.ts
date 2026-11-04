import {
  JobSourceAdapter,
  JobSourceId,
  SourceStatus,
  SourceCapability,
  FetchCriteria,
  FetchResult,
} from '../types.ts';

export abstract class BaseJobSourceAdapter implements JobSourceAdapter {
  abstract id: string;
  abstract source: JobSourceId;
  abstract displayName: string;
  abstract description: string;
  abstract status: SourceStatus;
  abstract capabilities: SourceCapability;
  lastChecked?: string;
  activeJobsCount?: number;

  abstract isConfigured(): boolean;
  abstract testConnection(): Promise<{ success: boolean; message: string; details?: any }>;
  abstract fetchJobs(criteria: FetchCriteria): Promise<FetchResult>;

  /**
   * Safe fetch with configurable timeout and exponential backoff retry
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 2,
    timeoutMs: number = 8000
  ): Promise<Response> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.status === 429) {
          // Rate limited - wait with exponential backoff
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

    throw lastError || new Error(`Request to ${url} failed after ${maxRetries} retries.`);
  }
}

