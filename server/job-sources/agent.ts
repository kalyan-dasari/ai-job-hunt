import { CandidateProfile } from '../../src/types/candidate.ts';
import { Job } from '../../src/types/job.ts';
import { CompanySource } from '../../src/types/connector.ts';
import { RawSourceJob, FetchCriteria, IngestionRunRecord, JobSourceReference } from './types.ts';
import { sourceRegistry } from './registry.ts';
import { normalizeRawJob, isIndiaEligibleJob } from './normalizer.ts';
import { deduplicator } from './deduplicator.ts';
import { calculateDossierMatch } from '../matching.ts';
import { careerPageCrawler } from './discovery/crawler.ts';
import {
  candidateRepository,
  jobsRepository,
  jobSourcesRepository,
  ingestionRunsRepository,
  activityLogsRepository,
  notificationsRepository,
  companySourcesRepository,
  discoveryAttemptsRepository,
} from '../database.ts';

export interface DiscoveryQueryPlan {
  keywords: string[];
  locations: string[];
  targetRole: string;
}

export interface DiscoveryOptions {
  sourceIds?: string[];
  companyIds?: string[];
  triggerType?: 'manual' | 'scheduled';
  forceExternal?: boolean;
  criteria?: FetchCriteria;
  limitCompanies?: number;
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
   * Main Dossier Web-First discovery workflow:
   * 1. Profile ingestion & candidate preferences
   * 2. Public company career-boards & ATS discovery (₹0 cost, zero paid API requirement)
   * 3. Configured aggregator fallback (if any external credentials provided)
   * 4. Merge & India-first filter
   * 5. Deduplicate against existing SQLite catalog
   * 6. 6D Dossier match scoring & recommendations
   * 7. Persistence & provenance tracking in SQLite
   */
  public async discover(options: DiscoveryOptions = {}): Promise<{ run: IngestionRunRecord; recommendations: Job[] }> {
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
      const existingJobs = jobsRepository.getAllJobs();
      const rawFetchedJobs: RawSourceJob[] = [];

      // 1. Direct Company Career-Boards & Public ATS Discovery (Core ₹0 Engine)
      let targetCompanies: CompanySource[] = [];
      if (options.companyIds && options.companyIds.length > 0) {
        targetCompanies = companySourcesRepository.getAll().filter(
          (c) => (c.isEnabled ?? true) && c.status !== 'disabled' && options.companyIds!.includes(c.id)
        );
      } else if (!options.sourceIds || options.sourceIds.length === 0) {
        targetCompanies = companySourcesRepository.getAll().filter(
          (c) => (c.isEnabled ?? true) && c.status !== 'disabled'
        );
        if (options.limitCompanies && options.limitCompanies > 0) {
          targetCompanies = targetCompanies.slice(0, options.limitCompanies);
        }
      }

      const exclusions: Array<{
        title: string;
        company: string;
        location: string;
        source: string;
        reason: string;
      }> = [];

      let indiaRelevantCount = 0;
      let fresherFriendlyCount = 0;
      let experiencedCount = 0;
      let unclearCount = 0;
      let totalUpdatedJobs = 0;
      let totalClosedJobs = 0;
      const newlyAddedJobs: Job[] = [];

      for (const comp of targetCompanies) {
        run.sourcesChecked.push(`${comp.name} (${comp.atsProvider || 'Web'})`);
        const crawlStart = Date.now();
        let compRawJobs = 0;
        let compNewJobs = 0;
        let compUpdatedJobs = 0;
        let compDuplicates = 0;
        let compClosedJobs = 0;

        try {
          const crawlRes = await careerPageCrawler.crawlCompany(comp);
          const durationMs = Date.now() - crawlStart;

          if (crawlRes.success) {
            compRawJobs = crawlRes.jobs.length;
            run.jobsFound += compRawJobs;
            const activeKeys = new Set<string>();

            for (const raw of crawlRes.jobs) {
              const extId = raw.externalId ? String(raw.externalId) : '';
              const jobUrl = raw.url || raw.canonicalUrl || '';
              const normKey = `${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '')}::${raw.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

              if (extId) activeKeys.add(extId);
              if (jobUrl) activeKeys.add(jobUrl);
              activeKeys.add(normKey);

              // 1. Strict India Relevance Check
              const indiaCheck = isIndiaEligibleJob(raw.location, raw.description, raw.country);
              if (!indiaCheck.eligible) {
                exclusions.push({
                  title: raw.title,
                  company: raw.company || comp.name,
                  location: raw.location || 'Unknown',
                  source: raw.sourceName,
                  reason: indiaCheck.reason || 'Non-India location or unconfirmed remote',
                });
                continue;
              }

              indiaRelevantCount++;
              const normalized = normalizeRawJob(raw);
              normalized.sourceId = comp.id;
              normalized.externalJobId = raw.externalId || normalized.sourceJobId || undefined;
              normalized.postedAt = raw.postedDate || undefined;

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
                compDuplicates++;
                run.duplicatesFiltered++;
                exclusions.push({
                  title: normalized.title,
                  company: normalized.company,
                  location: normalized.location,
                  source: normalized.source,
                  reason: `Duplicate of existing listing (Job ID: ${matchedJob.id})`,
                });

                // Refresh existing job's last_seen_at and metadata if changed
                const updated = jobsRepository.updateExistingJobSeen(matchedJob.id, {
                  description: normalized.description,
                  title: normalized.title,
                  datePosted: normalized.datePosted,
                });
                if (updated?.isUpdated) {
                  compUpdatedJobs++;
                  totalUpdatedJobs++;
                }

                // Record provenance link
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
                normalized.jobStatus = 'Open';
                normalized.firstSeenAt = new Date().toISOString();
                normalized.lastSeenAt = new Date().toISOString();
                normalized.lastVerifiedAt = new Date().toISOString();
                normalized.fresherStatus = normalized.matchResult?.fresherStatus || normalized.fresherStatus;
                normalized.locationCategory = normalized.matchResult?.locationCategory || normalized.locationCategory;

                if (normalized.fresherStatus === 'Fresher') fresherFriendlyCount++;
                else if (normalized.fresherStatus === 'Experienced') experiencedCount++;
                else unclearCount++;

                // 4. Persistence in SQLite
                const saved = jobsRepository.saveJob(normalized);
                existingJobs.unshift(saved);
                newlyAddedJobs.push(saved);

                jobSourcesRepository.addSourceReference({
                  id: `jsrc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                  jobId: saved.id,
                  sourceName: saved.source,
                  sourceJobId: saved.sourceJobId || undefined,
                  sourceUrl: saved.originalUrl,
                  discoveredAt: new Date().toISOString(),
                  rawMetadata: raw.rawMetadata,
                });

                compNewJobs++;
                run.jobsAdded++;
              }
            }

            // 5. Job Closure Detection for Complete Successful Crawl
            const { closedCount } = jobsRepository.markMissingJobsClosedForCompany(comp.id, comp.name, activeKeys);
            compClosedJobs = closedCount;
            totalClosedJobs += closedCount;

            companySourcesRepository.recordDetailedCrawlResult(comp.id, {
              httpStatus: crawlRes.httpStatus || 200,
              pagesFetched: crawlRes.pagesFetched || 1,
              rawJobs: compRawJobs,
              newJobs: compNewJobs,
              updatedJobs: compUpdatedJobs,
              duplicates: compDuplicates,
              closedJobs: compClosedJobs,
              durationMs,
            });
          } else {
            // Failed source crawl: DO NOT close missing jobs
            const errMsg = crawlRes.error || 'Failed to crawl company career board';
            run.errors.push(`[${comp.name}] ${errMsg}`);
            companySourcesRepository.recordDetailedCrawlResult(comp.id, {
              httpStatus: crawlRes.httpStatus || 500,
              pagesFetched: 0,
              rawJobs: 0,
              newJobs: 0,
              updatedJobs: 0,
              duplicates: 0,
              closedJobs: 0,
              durationMs,
              error: errMsg,
            });
          }
        } catch (compErr: any) {
          const durationMs = Date.now() - crawlStart;
          const errMsg = compErr.message || String(compErr);
          run.errors.push(`[${comp.name}] Crawl error: ${errMsg}`);
          companySourcesRepository.recordDetailedCrawlResult(comp.id, {
            httpStatus: 500,
            pagesFetched: 0,
            rawJobs: 0,
            newJobs: 0,
            updatedJobs: 0,
            duplicates: 0,
            closedJobs: 0,
            durationMs,
            error: errMsg,
          });
        }
      }

      // 2. Query configured external aggregator adapters (only if configured or explicitly requested)
      if (options.sourceIds && options.sourceIds.length > 0) {
        const queryPlans = this.generateSearchQueries(candidate);
        let activePlan: DiscoveryQueryPlan;
        if (options.criteria && options.criteria.keywords.length > 0) {
          activePlan = {
            keywords: options.criteria.keywords,
            locations: options.criteria.locations || ['India'],
            targetRole: options.criteria.keywords[0],
          };
        } else {
          activePlan = queryPlans[0];
        }

        const allAdapters = sourceRegistry.getAll();
        const selectedAdapters = allAdapters.filter((a) => options.sourceIds!.includes(a.id));

        for (const adapter of selectedAdapters) {
          run.sourcesChecked.push(adapter.displayName);

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
              run.jobsFound += fetchResult.jobs.length;

              for (const raw of fetchResult.jobs) {
                const indiaCheck = isIndiaEligibleJob(raw.location, raw.description, raw.country);
                if (!indiaCheck.eligible) {
                  exclusions.push({
                    title: raw.title,
                    company: raw.company,
                    location: raw.location || 'Unknown',
                    source: raw.sourceName,
                    reason: indiaCheck.reason || 'Non-India location',
                  });
                  continue;
                }

                const normalized = normalizeRawJob(raw);
                normalized.postedAt = raw.postedDate || undefined;

                const dedupResult = deduplicator.evaluate(normalized, existingJobs);
                if (dedupResult.isDuplicate && dedupResult.matchedExistingJob) {
                  run.duplicatesFiltered++;
                  jobsRepository.updateExistingJobSeen(dedupResult.matchedExistingJob.id, {
                    description: normalized.description,
                    title: normalized.title,
                  });
                } else {
                  normalized.matchResult = calculateDossierMatch(candidate, normalized);
                  normalized.freshnessStatus = 'Newly Discovered';
                  normalized.jobStatus = 'Open';
                  normalized.firstSeenAt = new Date().toISOString();
                  normalized.lastSeenAt = new Date().toISOString();
                  const saved = jobsRepository.saveJob(normalized);
                  existingJobs.unshift(saved);
                  newlyAddedJobs.push(saved);
                  run.jobsAdded++;
                }
              }
            }
          } catch (fetchErr: any) {
            run.errors.push(`[${adapter.displayName}] Fetch failed: ${fetchErr.message || fetchErr}`);
          }
        }
      }

      run.details = {
        exclusions: exclusions.slice(0, 50),
        stats: {
          totalDiscovered: run.jobsFound,
          indiaRelevant: indiaRelevantCount,
          fresherFriendly: fresherFriendlyCount,
          experienced: experiencedCount,
          unclear: unclearCount,
          duplicatesMerged: run.duplicatesFiltered,
          jobsAdded: run.jobsAdded,
          jobsUpdated: totalUpdatedJobs,
          jobsClosed: totalClosedJobs,
          failedSources: run.errors.length,
        },
      };

      run.status = 'completed';
      run.completedAt = new Date().toISOString();
      ingestionRunsRepository.updateRun(run.id, run);

      activityLogsRepository.log(
        'discovery_completed',
        'discovery_agent',
        run.id,
        `Web-First Job Discovery Agent completed: +${run.jobsAdded} new opportunities ingested (${run.duplicatesFiltered} duplicates merged, ${totalUpdatedJobs} updated, ${totalClosedJobs} closed).`
      );

      if (run.jobsAdded > 0) {
        const addedCompanies = [...new Set(newlyAddedJobs.map((j) => j.company))];
        const companySummary =
          addedCompanies.slice(0, 3).join(', ') +
          (addedCompanies.length > 3 ? ` and ${addedCompanies.length - 3} more` : '');

        notificationsRepository.createNotification({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          title: `Daily Discovery: ${run.jobsAdded} new opening${run.jobsAdded > 1 ? 's' : ''} found`,
          message: `Discovered ${run.jobsAdded} new opening${run.jobsAdded > 1 ? 's' : ''} across ${companySummary}.`,
          timestamp: new Date().toISOString(),
          type: 'job_alert',
          isRead: false,
          actionUrl: '/daily',
        });
      }

      // Sort all active jobs by match score to present strongest recommendations
      const recommendations = existingJobs
        .filter((j) => !j.isDismissed)
        .sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0))
        .slice(0, 30);

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
