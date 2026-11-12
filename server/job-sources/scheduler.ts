import { IngestionRunRecord, FetchCriteria } from './types.ts';
import { jobDiscoveryAgent } from './agent.ts';
import {
  candidateRepository,
  jobsRepository,
  ingestionRunsRepository,
  activityLogsRepository,
  schedulerRepository,
  companySourcesRepository,
} from '../database.ts';
import { calculateDossierMatch } from '../matching.ts';
import {
  computeNextRunAtIst,
  isCatchUpNeeded,
  formatIstDateTime,
} from '../temporal.ts';
import { SchedulerState } from '../../src/types/connector.ts';

export interface IngestionOptions {
  triggerType?: 'manual' | 'scheduled';
  sourceIds?: string[];
  companyIds?: string[];
  criteria?: FetchCriteria;
  forceExternal?: boolean;
  isCatchUp?: boolean;
}

export class IngestionService {
  private isIngestionRunning: boolean = false;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private catchUpTimeout: NodeJS.Timeout | null = null;
  private checkIntervalMs: number = 60 * 1000; // Check every 60 seconds

  public isRunning(): boolean {
    return this.isIngestionRunning;
  }

  public isSchedulerRunning(): boolean {
    return this.schedulerTimer !== null;
  }

  public getConfig(): SchedulerState & {
    isRunning: boolean;
    formattedNextRunIst: string;
    formattedLastRunIst: string;
    intervalMinutes: number;
    newJobsInLatestScan: number;
    totalActiveSources: number;
    successfulSourcesCount: number;
    failedSourcesCount: number;
    latestRunId: string | null;
    latestRunStatus: string | null;
  } {
    const state = schedulerRepository.getState();
    const intervalHours = state.intervalHours || 24;
    const recentRuns = ingestionRunsRepository.getRecentRuns(1);
    const latestRun = recentRuns.length > 0 ? recentRuns[0] : null;
    const activeCompanies = companySourcesRepository.getAll().filter(
      (c) => (c.isEnabled ?? true) && c.status !== 'disabled'
    );
    const failedSourcesCount = latestRun?.errors ? latestRun.errors.length : 0;
    const successfulSourcesCount = latestRun
      ? Math.max(0, latestRun.sourcesChecked.length - failedSourcesCount)
      : activeCompanies.length;

    return {
      ...state,
      intervalHours,
      intervalMinutes: Math.round(intervalHours * 60),
      isRunning: this.isIngestionRunning,
      formattedNextRunIst: formatIstDateTime(state.nextRunAt),
      formattedLastRunIst: formatIstDateTime(state.lastRunAt),
      newJobsInLatestScan: latestRun?.jobsAdded || 0,
      totalActiveSources: activeCompanies.length,
      successfulSourcesCount,
      failedSourcesCount,
      latestRunId: latestRun?.id || null,
      latestRunStatus: latestRun?.status || null,
    };
  }

  public updateConfig(updates: {
    enabled?: boolean;
    scheduleTimeIst?: string;
    intervalHours?: number;
    intervalMinutes?: number;
    catchUpEnabled?: boolean;
  }): SchedulerState {
    const current = schedulerRepository.getState();
    let computedHours = updates.intervalHours;
    if (computedHours === undefined && updates.intervalMinutes !== undefined) {
      computedHours = updates.intervalMinutes / 60;
    }
    const updated = schedulerRepository.updateState({
      enabled: updates.enabled !== undefined ? updates.enabled : current.enabled,
      scheduleTimeIst: updates.scheduleTimeIst || current.scheduleTimeIst || '07:00',
      intervalHours: computedHours !== undefined ? Math.max(0.1, Math.min(168, computedHours)) : current.intervalHours,
      catchUpEnabled: updates.catchUpEnabled !== undefined ? updates.catchUpEnabled : current.catchUpEnabled,
    });

    if (updated.enabled) {
      this.startScheduler();
    } else {
      this.stopScheduler();
    }

    return updated;
  }

  /**
   * Run full discovery and ingestion across all active ATS & company sources
   */
  public async runIngestion(options: IngestionOptions = {}): Promise<IngestionRunRecord> {
    if (this.isIngestionRunning) {
      throw new Error('Discovery is already running. Please wait for the current run to complete.');
    }

    this.isIngestionRunning = true;
    schedulerRepository.recordRunStart();

    const triggerType = options.triggerType || 'manual';
    console.log(`[Scheduler] Starting discovery pass (trigger: ${triggerType}, isCatchUp: ${Boolean(options.isCatchUp)})...`);

    try {
      const { run } = await jobDiscoveryAgent.discover({
        sourceIds: options.sourceIds,
        companyIds: options.companyIds,
        triggerType,
        forceExternal: options.forceExternal,
        criteria: options.criteria,
      });

      // Local catalog maintenance: refresh freshness and match scores
      await this.refreshLocalCatalog();

      schedulerRepository.recordRunComplete(true);
      console.log(`[Scheduler] Discovery pass completed successfully: +${run.jobsAdded} new openings, ${run.duplicatesFiltered} duplicates.`);
      return run;
    } catch (err: any) {
      const errMsg = err.message || String(err);
      schedulerRepository.recordRunComplete(false, errMsg);
      console.error('[Scheduler] Discovery pass failed:', errMsg);
      throw err;
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
      const postedTime = job.postedAt ? new Date(job.postedAt).getTime() : new Date(job.datePosted).getTime();
      const ageDays = (now - postedTime) / (1000 * 60 * 60 * 24);

      if (ageDays > 30 && job.freshnessStatus !== 'Expired' && job.freshnessStatus !== 'Closed') {
        jobsRepository.updateFreshness(job.id, 'Expired');
        staleCount++;
      } else if (ageDays <= 14 && job.freshnessStatus === 'Active') {
        // Active verified
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
      `Local job processing: refreshed ${refreshedCount} candidate matches.`
    );

    return { refreshedCount, staleCount };
  }

  /**
   * Starts the persistent background scheduler.
   * Handles:
   * 1. Startup catch-up discovery if last run > 24 hours ago.
   * 2. Calculation of next execution time anchored to Asia/Kolkata (e.g. 7:00 AM IST).
   * 3. 60-second periodic heartbeat checking if next scheduled time has arrived.
   */
  public startScheduler(): void {
    this.stopScheduler();

    const state = schedulerRepository.getState();
    if (!state.enabled) {
      console.log('[Scheduler] Background scheduler is disabled in settings.');
      return;
    }

    // 1. Startup Catch-Up Check
    if (state.catchUpEnabled && isCatchUpNeeded(state.lastSuccessfulRunAt, state.intervalHours || 24)) {
      console.log(`[Scheduler] Catch-up needed (last successful discovery: ${state.lastSuccessfulRunAt || 'Never'}). Scheduling catch-up run in 3 seconds...`);
      this.catchUpTimeout = setTimeout(async () => {
        try {
          if (!this.isIngestionRunning) {
            console.log('[Scheduler] Executing automated startup catch-up discovery...');
            await this.runIngestion({ triggerType: 'scheduled', isCatchUp: true });
          }
        } catch (err) {
          console.error('[Scheduler] Catch-up discovery error:', err);
        }
      }, 3000);
    }

    // 2. Compute and persist initial nextRunAt if not set or in the past
    const now = Date.now();
    let nextRunTime = state.nextRunAt ? new Date(state.nextRunAt).getTime() : 0;
    if (isNaN(nextRunTime) || nextRunTime <= now) {
      const nextRunAtIso = computeNextRunAtIst(state.scheduleTimeIst || '07:00', state.intervalHours || 24);
      schedulerRepository.updateState({ nextRunAt: nextRunAtIso });
      console.log(`[Scheduler] Next daily discovery scheduled for ${formatIstDateTime(nextRunAtIso)}`);
    } else {
      console.log(`[Scheduler] Next daily discovery scheduled for ${formatIstDateTime(state.nextRunAt)}`);
    }

    // 3. Heartbeat loop (every 60s)
    this.schedulerTimer = setInterval(async () => {
      try {
        const currentState = schedulerRepository.getState();
        if (!currentState.enabled || this.isIngestionRunning) return;

        if (currentState.nextRunAt) {
          const dueTime = new Date(currentState.nextRunAt).getTime();
          if (Date.now() >= dueTime) {
            console.log(`[Scheduler] Target schedule time arrived (${formatIstDateTime(currentState.nextRunAt)}). Triggering daily discovery...`);
            await this.runIngestion({ triggerType: 'scheduled' });
          }
        }
      } catch (err) {
        console.error('[Scheduler] Error in heartbeat loop:', err);
      }
    }, this.checkIntervalMs);
  }

  public stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.catchUpTimeout) {
      clearTimeout(this.catchUpTimeout);
      this.catchUpTimeout = null;
    }
  }
}

export const ingestionService = new IngestionService();
