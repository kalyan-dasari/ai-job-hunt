import { CandidateProfile } from '../../src/types/candidate.ts';
import { Job } from '../../src/types/job.ts';
import { RawSourceJob, FetchCriteria, IngestionRunRecord, JobSourceReference } from './types.ts';
import { sourceRegistry } from './registry.ts';
import { normalizeRawJob, isIndiaEligibleJob } from './normalizer.ts';
import { deduplicator } from './deduplicator.ts';
import { calculateDossierMatch } from '../matching.ts';
import {
  candidateRepository,
  jobsRepository,
  jobSourcesRepository,
  ingestionRunsRepository,
  activityLogsRepository,
  notificationsRepository,
  connectorsRepository,
  apiUsageRepository,
} from '../database.ts';

export interface DiscoveryQueryPlan {
  keywords: string[];
  locations: string[];
  targetRole: string;
}

export class JobDiscoveryAgent {
  private queryRotationIndex: number = 0;

  /**
   * Intelligently builds a small, targeted set of India-focused search queries
   * from the candidate's preferred roles, skills, and locations.
   */
  public generateSearchQueries(profile: CandidateProfile): DiscoveryQueryPlan[] {
    const plans: DiscoveryQueryPlan[] = [];
    const roles = profile.preferredRoles && profile.preferredRoles.length > 0
      ? profile.preferredRoles
      : profile.headline
      ? [profile.headline]
      : ['Software Engineer', 'Full Stack Developer'];

    const topSkills = profile.skills && profile.skills.length > 0
      ? profile.skills.slice(0, 3)
      : ['TypeScript', 'React'];

    const locations = profile.preferredLocations && profile.preferredLocations.length > 0
      ? profile.preferredLocations
      : ['Bengaluru', 'Hyderabad', 'India'];

    // Plan 1: Primary Target Role in primary location
    plans.push({
      keywords: [roles[0]],
      locations: [locations[0] || 'India'],
      targetRole: roles[0],
    });

    // Plan 2: Skills-based search across India tech hubs
    if (topSkills.length > 0) {
      plans.push({
        keywords: [`${topSkills.slice(0, 2).join(' ')} Developer`],
        locations: ['India'],
        targetRole: `${topSkills[0]} Developer`,
      });
    }

    // Plan 3: Remote opportunities explicitly for India
    plans.push({
      keywords: [roles[0]],
      locations: ['Remote'],
      targetRole: `Remote ${roles[0]}`,
    });

    return plans;
  }

  /**
   * Main Dossier discovery workflow:
   * 1. Profile ingestion
   * 2. Targeted query formulation & rotation
   * 3. Fetch from primary channels (JSearch, Adzuna, Career Boards)
   * 4. Merge & India-first filter
   * 5. Deduplicate against existing SQLite catalog
   * 6. Dossier match scoring & recommendations
   */
  public async discover(options: {
    sourceIds?: string[];
    triggerType?: 'manual' | 'scheduled';
    forceExternal?: boolean;
    criteria?: FetchCriteria;
  } = {}): Promise<{ run: IngestionRunRecord; recommendations: Job[] }> {
    const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();
    const triggerType = options.triggerType || 'manual';

    const run: IngestionRunRecord = {
      id: runId,
      triggerType,
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
      const queryPlans = this.generateSearchQueries(candidate);

      // In scheduled mode, rotate queries to conserve monthly API quotas
      let activePlan: DiscoveryQueryPlan;
      if (options.criteria && options.criteria.keywords.length > 0) {
        activePlan = {
          keywords: options.criteria.keywords,
          locations: options.criteria.locations || ['India'],
          targetRole: options.criteria.keywords[0],
        };
      } else if (triggerType === 'scheduled') {
        activePlan = queryPlans[this.queryRotationIndex % queryPlans.length];
        this.queryRotationIndex++;
      } else {
        activePlan = queryPlans[0];
      }

      // Determine active discovery channels
      const allAdapters = sourceRegistry.getAll();
      let targetAdapters = allAdapters.filter(
        (a) => a.id === 'jsearch-api' || a.id === 'adzuna-api' || a.id === 'career-pages-public'
      );

      if (options.sourceIds && options.sourceIds.length > 0) {
        targetAdapters = allAdapters.filter((a) => options.sourceIds!.includes(a.id));
      }

      const existingJobs = jobsRepository.getAllJobs();
      const rawFetchedJobs: RawSourceJob[] = [];

      for (const adapter of targetAdapters) {
        run.sourcesChecked.push(adapter.displayName);

        // Check if provider is configured and not rate-limited
        if (!adapter.isConfigured()) {
          run.errors.push(`[${adapter.displayName}] Awaiting credentials; skipped live query.`);
          continue;
        }

        try {
          const fetchCriteria: FetchCriteria = {
            keywords: activePlan.keywords,
            locations: activePlan.locations,
            limit: 15,
            page: 1,
          };

          const fetchResult = await adapter.fetchJobs(fetchCriteria);

          if (!fetchResult.success && fetchResult.error) {
            run.errors.push(`[${adapter.displayName}] ${fetchResult.error}`);
          }

          if (fetchResult.jobs && fetchResult.jobs.length > 0) {
            rawFetchedJobs.push(...fetchResult.jobs);
            run.jobsFound += fetchResult.jobs.length;
          }
        } catch (fetchErr: any) {
          run.errors.push(`[${adapter.displayName}] Fetch failed: ${fetchErr.message || fetchErr}`);
        }
      }

      // Ingestion Pipeline: Filter -> Deduplicate -> Store -> Match
      for (const raw of rawFetchedJobs) {
        // 1. India-first Filtering
        const indiaCheck = isIndiaEligibleJob(raw.location, raw.description);
        if (!indiaCheck.eligible) {
          // Skip roles restricted to other countries
          continue;
        }

        const normalized = normalizeRawJob(raw);

        // 2. Cross-Source Deduplication Check
        let existingJobId: string | null = null;
        if (raw.externalId) {
          existingJobId = jobSourcesRepository.findExistingJobByExternalId(
            normalized.source,
            raw.externalId
          );
        }

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
          // Provenance cross-reference link
          jobSourcesRepository.addSourceReference({
            id: `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            jobId: matchedJob.id,
            sourceName: normalized.source,
            sourceJobId: normalized.sourceJobId || undefined,
            sourceUrl: normalized.originalUrl,
            discoveredAt: new Date().toISOString(),
            rawMetadata: raw.rawMetadata,
          });
        } else {
          // 3. Intelligent Match Calculation
          normalized.matchResult = calculateDossierMatch(candidate, normalized);
          normalized.freshnessStatus = 'Newly Discovered';
          normalized.lastVerifiedAt = new Date().toISOString();

          // 4. Persistence in SQLite
          const saved = jobsRepository.saveJob(normalized);
          existingJobs.unshift(saved);

          jobSourcesRepository.addSourceReference({
            id: `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            jobId: saved.id,
            sourceName: saved.source,
            sourceJobId: saved.sourceJobId || undefined,
            sourceUrl: saved.originalUrl,
            discoveredAt: new Date().toISOString(),
            rawMetadata: raw.rawMetadata,
          });

          run.jobsAdded++;
        }
      }

      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      ingestionRunsRepository.updateRun(run.id, run);

      activityLogsRepository.log(
        'discovery_completed',
        'discovery_agent',
        run.id,
        `Dossier Discovery Agent completed: +${run.jobsAdded} new opportunities ingested (${run.duplicatesFiltered} duplicates merged).`
      );

      if (run.jobsAdded > 0) {
        notificationsRepository.createNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: 'Dossier Job Recommendations Ready',
          message: `Discovered ${run.jobsAdded} relevant opportunities matching your profile in India hubs.`,
          timestamp: new Date().toISOString(),
          type: 'job_alert',
          isRead: false,
          actionUrl: '/discovery',
        });
      }

      // Sort all active jobs by match score to present strongest recommendations
      const recommendations = existingJobs
        .filter((j) => !j.isDismissed)
        .sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0))
        .slice(0, 20);

      return { run, recommendations };
    } catch (err: any) {
      run.status = 'failed';
      run.completedAt = new Date().toISOString();
      run.errors.push(`Discovery agent exception: ${err.message || err}`);
      ingestionRunsRepository.updateRun(run.id, run);
      throw err;
    }
  }
}

export const jobDiscoveryAgent = new JobDiscoveryAgent();
