import { IngestionRunRecord, FetchCriteria, JobSourceReference } from './types.ts';
import { sourceRegistry } from './registry.ts';
import { normalizeRawJob } from './normalizer.ts';
import { deduplicator } from './deduplicator.ts';
import {
  candidateRepository,
  jobsRepository,
  jobSourcesRepository,
  ingestionRunsRepository,
  connectorsRepository,
  activityLogsRepository,
  notificationsRepository,
} from '../database.ts';
import { calculateDeterministicMatch } from '../matching.ts';
import { Job } from '../../src/types/job.ts';

export interface IngestionOptions {
  triggerType?: 'manual' | 'scheduled';
  sourceIds?: string[];
  criteria?: FetchCriteria;
}

export class IngestionService {
  private isIngestionRunning: boolean = false;
  private schedulerTimer: NodeJS.Timeout | null = null;
  private schedulerIntervalMs: number = 60 * 60 * 1000; // 1 hour default

  public isRunning(): boolean {
    return this.isIngestionRunning;
  }

  public isSchedulerRunning(): boolean {
    return this.schedulerTimer !== null;
  }

  public async runIngestion(options: IngestionOptions = {}): Promise<IngestionRunRecord> {
    if (this.isIngestionRunning) {
      throw new Error('Ingestion is already running. Please wait for the current run to complete.');
    }

    this.isIngestionRunning = true;
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const run: IngestionRunRecord = {
      id: runId,
      triggerType: options.triggerType || 'manual',
      status: 'running',
      startedAt: nowIso,
      sourcesChecked: [],
      jobsFound: 0,
      jobsAdded: 0,
      duplicatesFiltered: 0,
      errors: [],
      createdAt: nowIso,
    };

    ingestionRunsRepository.createRun(run);

    try {
      const candidate = candidateRepository.getProfile();

      // Formulate discovery criteria from candidate profile preferences
      const criteria: FetchCriteria = options.criteria || {
        keywords:
          candidate.preferredRoles && candidate.preferredRoles.length > 0
            ? candidate.preferredRoles
            : candidate.skills && candidate.skills.length > 0
            ? candidate.skills.slice(0, 5)
            : ['Software Engineer', 'Developer', 'Frontend', 'Backend'],
        locations: candidate.preferredLocations || [],
        arrangements: candidate.preferredArrangements || undefined,
        employmentTypes: candidate.preferredTypes || undefined,
        limit: 25,
      };

      // Select target adapters
      const allActive = sourceRegistry.getActive();
      let targetAdapters = allActive;

      if (options.sourceIds && options.sourceIds.length > 0) {
        targetAdapters = allActive.filter((a) => options.sourceIds!.includes(a.id));
      }

      if (targetAdapters.length === 0) {
        const msg =
          'No active configured sources available. Adapters like Naukri, LinkedIn, Internshala, and Foundit require API credentials, or no sources were selected.';
        run.status = 'completed';
        run.completedAt = new Date().toISOString();
        run.errors.push(msg);
        ingestionRunsRepository.updateRun(run.id, run);
        return run;
      }

      // Existing jobs cache for cross-batch and in-batch deduplication
      const existingJobs = jobsRepository.getAllJobs();

      for (const adapter of targetAdapters) {
        run.sourcesChecked.push(adapter.displayName);

        try {
          const fetchResult = await adapter.fetchJobs(criteria);

          if (!fetchResult.success) {
            run.errors.push(`[${adapter.displayName}] ${fetchResult.error || 'Fetch failed'}`);
          }

          if (fetchResult.jobs && fetchResult.jobs.length > 0) {
            run.jobsFound += fetchResult.jobs.length;

            for (const rawJob of fetchResult.jobs) {
              const normalized = normalizeRawJob(rawJob);

              // 1. Check external ID in job_sources
              let existingJobId: string | null = null;
              if (rawJob.externalId) {
                existingJobId = jobSourcesRepository.findExistingJobByExternalId(
                  normalized.source,
                  rawJob.externalId
                );
              }

              // 2. Check title / company / URL similarity
              let isDup = false;
              let matchedJob: Job | null = null;

              if (existingJobId) {
                isDup = true;
                matchedJob = jobsRepository.getJobById(existingJobId);
              } else {
                const dedupResult = deduplicator.evaluate(normalized, existingJobs);
                if (dedupResult.isDuplicate && dedupResult.matchedExistingJob) {
                  isDup = true;
                  matchedJob = dedupResult.matchedExistingJob;
                }
              }

              if (isDup && matchedJob) {
                run.duplicatesFiltered++;
                // Record provenance link so the existing job knows it also appears on this source
                const ref: JobSourceReference = {
                  id: `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  jobId: matchedJob.id,
                  sourceName: normalized.source,
                  sourceJobId: normalized.sourceJobId || undefined,
                  sourceUrl: normalized.originalUrl,
                  discoveredAt: new Date().toISOString(),
                  rawMetadata: rawJob.rawMetadata,
                };
                jobSourcesRepository.addSourceReference(ref);
              } else {
                // Calculate match score
                normalized.matchResult = calculateDeterministicMatch(candidate, normalized);
                normalized.freshnessStatus = 'Newly Discovered';
                normalized.lastVerifiedAt = new Date().toISOString();

                // Persist new job
                const saved = jobsRepository.saveJob(normalized);
                existingJobs.unshift(saved);

                // Add source reference
                const ref: JobSourceReference = {
                  id: `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  jobId: saved.id,
                  sourceName: saved.source,
                  sourceJobId: saved.sourceJobId || undefined,
                  sourceUrl: saved.originalUrl,
                  discoveredAt: new Date().toISOString(),
                  rawMetadata: rawJob.rawMetadata,
                };
                jobSourcesRepository.addSourceReference(ref);

                run.jobsAdded++;
              }
            }
          }

          // Update connector active jobs count and last sync timestamp
          try {
            const connector = connectorsRepository.getAllConnectors().find(
              (c) => c.displayName.toLowerCase().includes(adapter.displayName.toLowerCase()) ||
                     c.name.toLowerCase() === adapter.source.toLowerCase()
            );
            if (connector) {
              connector.lastSyncTimestamp = new Date().toISOString();
              connector.activeJobsCount = (connector.activeJobsCount || 0) + (fetchResult.jobs?.length || 0);
              connectorsRepository.saveConnector(connector);
            }
          } catch (connErr) {
            console.error('Failed to update connector metadata:', connErr);
          }
        } catch (adapterErr: any) {
          run.errors.push(`[${adapter.displayName}] Unexpected failure: ${adapterErr.message || adapterErr}`);
        }
      }

      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      ingestionRunsRepository.updateRun(run.id, run);

      activityLogsRepository.log(
        'ingestion_completed',
        'ingestion',
        run.id,
        `Ingestion run finished: +${run.jobsAdded} new, ${run.duplicatesFiltered} duplicates filtered across ${run.sourcesChecked.length} sources.`
      );

      if (run.jobsAdded > 0) {
        notificationsRepository.createNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: 'New Opportunities Discovered',
          message: `Ingested ${run.jobsAdded} new jobs matching your profile (${run.duplicatesFiltered} duplicate listings filtered).`,
          timestamp: new Date().toISOString(),
          type: 'job_alert',
          isRead: false,
          actionUrl: '/discovery',
        });
      }

      return run;
    } catch (err: any) {
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      run.errors.push(`Fatal ingestion error: ${err.message || err}`);
      ingestionRunsRepository.updateRun(run.id, run);
      throw err;
    } finally {
      this.isIngestionRunning = false;
    }
  }

  public startScheduler(intervalMinutes: number = 60): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
    }
    this.schedulerIntervalMs = Math.max(5, intervalMinutes) * 60 * 1000;
    this.schedulerTimer = setInterval(async () => {
      try {
        console.log('[Scheduler] Executing scheduled discovery ingestion...');
        await this.runIngestion({ triggerType: 'scheduled' });
      } catch (err) {
        console.error('[Scheduler] Scheduled ingestion error:', err);
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
