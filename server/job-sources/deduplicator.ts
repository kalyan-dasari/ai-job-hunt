import { Job } from '../../src/types/job.ts';

// Helper to normalize company names for comparison
export function normalizeCompanySlug(company: string): string {
  if (!company) return '';
  return company
    .toLowerCase()
    .replace(/\b(inc|ltd|llc|pvt|corp|corporation|technologies|solutions|services|systems|gmbh|co)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Tokenize title into meaningful keywords
export function tokenizeTitle(title: string): Set<string> {
  const stopWords = new Set(['and', 'or', 'for', 'the', 'in', 'at', 'with', 'a', 'an', 'to', 'of']);
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));
  return new Set(tokens);
}

// Jaccard similarity between two token sets
export function calculateJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersectionCount = 0;
  setA.forEach((token) => {
    if (setB.has(token)) intersectionCount++;
  });

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

export interface DeduplicationCheckResult {
  isDuplicate: boolean;
  matchedExistingJob?: Job;
  reason?: string;
  confidence: number; // 0 - 100
}

export class JobDeduplicator {
  /**
   * Check if an incoming job matches any existing job in the provided catalog
   */
  public evaluate(incoming: Job, existingCatalog: Job[]): DeduplicationCheckResult {
    const incomingCompSlug = normalizeCompanySlug(incoming.company);
    const incomingTitleTokens = tokenizeTitle(incoming.title);
    const incomingNormUrl = incoming.canonicalUrl?.toLowerCase().replace(/\/$/, '');

    for (const existing of existingCatalog) {
      // 1. Exact Source & External ID Match
      if (
        incoming.source === existing.source &&
        incoming.sourceJobId &&
        existing.sourceJobId &&
        incoming.sourceJobId === existing.sourceJobId
      ) {
        return {
          isDuplicate: true,
          matchedExistingJob: existing,
          reason: `Exact source external ID match on ${incoming.source} (${incoming.sourceJobId})`,
          confidence: 100,
        };
      }

      // 2. Exact Canonical URL Match
      const existingNormUrl = existing.canonicalUrl?.toLowerCase().replace(/\/$/, '');
      if (
        incomingNormUrl &&
        existingNormUrl &&
        incomingNormUrl !== 'https://example.com/careers' &&
        incomingNormUrl === existingNormUrl
      ) {
        return {
          isDuplicate: true,
          matchedExistingJob: existing,
          reason: `Exact canonical URL cross-match: ${incomingNormUrl}`,
          confidence: 98,
        };
      }

      // 3. Composite Similarity Check: Same Company + High Title Similarity
      const existingCompSlug = normalizeCompanySlug(existing.company);
      if (incomingCompSlug && existingCompSlug && incomingCompSlug === existingCompSlug) {
        // Guard against merging genuinely different roles:
        // A) Different engineering disciplines must NEVER merge
        const isFrontendA = incoming.title.toLowerCase().includes('frontend') || incoming.title.toLowerCase().includes('front-end') || incoming.title.toLowerCase().includes('ui');
        const isBackendA = incoming.title.toLowerCase().includes('backend') || incoming.title.toLowerCase().includes('back-end') || incoming.title.toLowerCase().includes('api');
        const isFrontendB = existing.title.toLowerCase().includes('frontend') || existing.title.toLowerCase().includes('front-end') || existing.title.toLowerCase().includes('ui');
        const isBackendB = existing.title.toLowerCase().includes('backend') || existing.title.toLowerCase().includes('back-end') || existing.title.toLowerCase().includes('api');

        if ((isFrontendA && isBackendB && !isBackendA) || (isBackendA && isFrontendB && !isFrontendA)) {
          continue; // Genuinely different disciplines!
        }

        const isDataA = incoming.title.toLowerCase().includes('data') || incoming.title.toLowerCase().includes('machine learning') || incoming.title.toLowerCase().includes('ml') || incoming.title.toLowerCase().includes('analytics');
        const isDataB = existing.title.toLowerCase().includes('data') || existing.title.toLowerCase().includes('machine learning') || existing.title.toLowerCase().includes('ml') || existing.title.toLowerCase().includes('analytics');
        const isSweA = incoming.title.toLowerCase().includes('engineer') || incoming.title.toLowerCase().includes('developer');
        const isSweB = existing.title.toLowerCase().includes('engineer') || existing.title.toLowerCase().includes('developer');

        if ((isDataA && !isDataB && (isFrontendB || isBackendB)) || (isDataB && !isDataA && (isFrontendA || isBackendA))) {
          continue; // Data Scientist vs Software Engineer!
        }

        // B) Distinct seniority levels (e.g. Intern vs Lead/Principal) must NEVER merge
        const isInternA = incoming.experienceLevel === 'Intern';
        const isLeadA = incoming.experienceLevel === 'Lead';
        const isInternB = existing.experienceLevel === 'Intern';
        const isLeadB = existing.experienceLevel === 'Lead';
        if ((isInternA && isLeadB) || (isLeadA && isInternB)) {
          continue; // Genuinely different seniority levels!
        }

        // C) Check Title Jaccard Similarity
        const existingTitleTokens = tokenizeTitle(existing.title);
        const titleSim = calculateJaccardSimilarity(incomingTitleTokens, existingTitleTokens);

        // Normalize simple title slugs
        const normTitleA = incoming.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normTitleB = existing.title.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normTitleA === normTitleB) {
          return {
            isDuplicate: true,
            matchedExistingJob: existing,
            reason: `Identical company (${incoming.company}) and normalized role title (${incoming.title})`,
            confidence: 95,
          };
        }

        if (titleSim >= 0.8) {
          // Verify compatible location / remote arrangement
          const locA = incoming.location.toLowerCase();
          const locB = existing.location.toLowerCase();
          const isCompatibleLocation =
            incoming.workArrangement === 'Remote' ||
            existing.workArrangement === 'Remote' ||
            locA.includes(locB.split(',')[0]) ||
            locB.includes(locA.split(',')[0]) ||
            locA === 'not specified' ||
            locB === 'not specified';

          if (isCompatibleLocation) {
            return {
              isDuplicate: true,
              matchedExistingJob: existing,
              reason: `Fuzzy title match (${Math.round(titleSim * 100)}% keyword similarity) at same company (${incoming.company})`,
              confidence: Math.round(titleSim * 90),
            };
          }
        }
      }
    }

    return {
      isDuplicate: false,
      confidence: 0,
    };
  }

  /**
   * Non-destructively merge incoming fresh metadata into an existing canonical job record
   */
  public merge(canonical: Job, fresh: Job): Job {
    const mergedSkills = Array.from(new Set([...(canonical.requiredSkills || []), ...(fresh.requiredSkills || [])]));
    const mergedPreferred = Array.from(new Set([...(canonical.preferredSkills || []), ...(fresh.preferredSkills || [])]));

    return {
      ...canonical,
      // Keep user's saved and dismissed states
      isSaved: canonical.isSaved,
      isDismissed: canonical.isDismissed,
      // Update freshness timestamp
      lastChecked: fresh.lastChecked || new Date().toISOString(),
      // Enrich salary if existing was undisclosed and fresh has disclosure
      salary: (!canonical.salary?.disclosed && fresh.salary?.disclosed) ? fresh.salary : canonical.salary,
      // Enrich skills
      requiredSkills: mergedSkills.length > 0 ? mergedSkills : canonical.requiredSkills,
      preferredSkills: mergedPreferred,
      // Mark as cross-posted
      isDuplicate: false,
    };
  }
}

export const deduplicator = new JobDeduplicator();
