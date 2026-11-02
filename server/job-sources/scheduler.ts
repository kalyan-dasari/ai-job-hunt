import { IngestionRunRecord, FetchCriteria } from './types.ts';
import { jobDiscoveryAgent } from './agent.ts';
import {
  candidateRepository,
  jobsRepository,
  ingestionRunsRepository,
  activityLogsRepository,
} from '../database.ts';
import { calculateDossierMatch } from '../matching.ts';

export interface IngestionOptions {
  triggerType?: 'manual' | 'scheduled';
  sourceIds?: string[];
  criteria?: FetchCriteria;
  forceExternal?: boolean;
}

export class IngestionService {
  private isIngestionRunning: boolean = false;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private schedulerIntervalMs: number = 60 * 60 * 1000; // 1 hour default
  private runsSinceLastExternalFetch: number = 0;

  public isRunning(): boolean {
    return this.isIngestionRunning;
  }

  public isSchedulerRunning(): boolean {
    return this.schedulerTimer !== null;
  }

  /**
   * Run full discovery and ingestion using the Dossier JobDiscoveryAgent
   */
  public async runIngestion(options: IngestionOptions = {}): Promise<IngestionRunRecord> {
    if (this.isIngestionRunning) {
      throw new Error('Ingestion is already running. Please wait for the current run to complete.');
    }

    this.isIngestionRunning = true;
    try {
      const { run } = await jobDiscoveryAgent.discover({
        sourceIds: options.sourceIds,
        triggerType: options.triggerType || 'manual',
        forceExternal: options.forceExternal,
        criteria: options.criteria,
      });
      return run;
    } finally {
      this.isIngestionRunning = false;
    }
  }

  /**
   * Local maintenance: re-evaluates candidate matches, updates freshness statuses,
   * cleans expired cache records. Does NOT consume external provider quotas.
   */
  public async refreshLocalCatalog(): Promise<{ refreshedCount: number; staleCount: number }> {
    const candidate = candidateRepository.getProfile();
    const jobs = jobsRepository.getAllJobs();
    let refreshedCount = 0;
    let staleCount = 0;

    const now = Date.now();
    for (const job of jobs) {
      if (job.isDismissed) continue;

      // Check age for freshness status updates
      const postedTime = new Date(job.datePosted).getTime();
      const ageDays = (now - postedTime) / (1000 * 60 * 60 * 24);

      if (ageDays > 30 && job.freshnessStatus !== 'Expired' && job.freshnessStatus !== 'Closed') {
        jobsRepository.updateFreshness(job.id, 'Expired');
        staleCount++;
      } else if (ageDays > 14 && job.freshnessStatus === 'Newly Discovered') {
        jobsRepository.updateFreshness(job.id, 'Active');
      }

      // Recalculate intelligent match
      const updatedMatch = calculateDossierMatch(candidate, job);
      jobsRepository.updateMatch(job.id, updatedMatch);
      refreshedCount++;
    }

    activityLogsRepository.log(
      'local_catalog_refreshed',
      'scheduler',
      null,
      `Local job processing: refreshed ${refreshedCount} candidate matches without spending external API quotas.`
    );

    return { refreshedCount, staleCount };
  }

  /**
   * Starts the hourly scheduler.
   * Separates:
   * A. Hourly local job processing & match recalculation (zero API quota spent).
   * B. Controlled, quota-preserving external discovery using rotated queries.
   */
  public startScheduler(intervalMinutes: number = 60): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
    }
    this.schedulerIntervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
    this.schedulerTimer = setInterval(async () => {
      try {
        console.log('[Scheduler] Executing hourly local catalog maintenance...');
        await this.refreshLocalCatalog();

        // Perform external discovery every 6 hours (or when needed) to respect monthly quota limits
        this.runsSinceLastExternalFetch++;
        if (this.runsSinceLastExternalFetch >= 6) {
          this.runsSinceLastExternalFetch = 0;
          console.log('[Scheduler] Executing quota-conscious external discovery pass...');
          await this.runIngestion({ triggerType: 'scheduled' });
        }
      } catch (err) {
        console.error('[Scheduler] Error in background scheduler loop:', err);
      }
    }, this.schedulerIntervalMs);
  }

  public stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }
}

export const ingestionService = new IngestionService();
