export interface DetectedAtsResult {
  provider: string; // 'greenhouse' | 'lever' | 'ashby' | 'workable' | 'smartrecruiters' | 'recruitee' | 'personio' | 'breezy' | 'teamtailor' | 'rippling' | 'workday'
  slug: string;
  sourceUrl: string;
  confidence: number; // 0 - 100
}

/**
 * Reusable ATS detector identifying ATS platform and slug from career page URLs, links, or HTML.
 */
export class AtsDetector {
  /**
   * Detects ATS provider and slug from a URL or page HTML.
   */
  public detect(url: string, htmlContent: string = ''): DetectedAtsResult | null {
    const combined = `${url} \n ${htmlContent}`;

    // 1. Greenhouse
    // Patterns: boards.greenhouse.io/{slug}, boards-api.greenhouse.io/{slug}, grnh.se/{slug}
    const ghMatch = combined.match(/(?:boards\.greenhouse\.io|boards-api\.greenhouse\.io|grnh\.se)\/(?:embed\/job_board\?for=)?([a-zA-Z0-9_-]+)/i);
    if (ghMatch && ghMatch[1] && ghMatch[1] !== 'embed') {
      return {
        provider: 'greenhouse',
        slug: ghMatch[1],
        sourceUrl: url,
        confidence: 95,
      };
    }

    // 2. Lever
    // Patterns: jobs.lever.co/{slug}, api.lever.co/v0/postings/{slug}
    const leverMatch = combined.match(/(?:jobs\.lever\.co|api\.lever\.co\/v0\/postings)\/([a-zA-Z0-9_-]+)/i);
    if (leverMatch && leverMatch[1]) {
      return {
        provider: 'lever',
        slug: leverMatch[1],
        sourceUrl: url,
        confidence: 95,
      };
    }

    // 3. Ashby
    // Patterns: jobs.ashbyhq.com/{slug}, api.ashbyhq.com/posting-api/job-board/{slug}
    const ashbyMatch = combined.match(/(?:jobs\.ashbyhq\.com|api\.ashbyhq\.com\/posting-api\/job-board)\/([a-zA-Z0-9_-]+)/i);
    if (ashbyMatch && ashbyMatch[1]) {
      return {
        provider: 'ashby',
        slug: ashbyMatch[1],
        sourceUrl: url,
        confidence: 95,
      };
    }

    // 4. Workable
    // Patterns: apply.workable.com/{slug}, jobs.workable.com/{slug}
    const workableMatch = combined.match(/(?:apply\.workable\.com|jobs\.workable\.com)\/(?:api\/v1\/widget\/accounts\/)?([a-zA-Z0-9_-]+)/i);
    if (workableMatch && workableMatch[1] && workableMatch[1] !== 'j') {
      return {
        provider: 'workable',
        slug: workableMatch[1],
        sourceUrl: url,
        confidence: 95,
      };
    }

    // 5. SmartRecruiters
    // Patterns: jobs.smartrecruiters.com/{slug}, api.smartrecruiters.com/v1/companies/{slug}
    const srMatch = combined.match(/(?:jobs\.smartrecruiters\.com|api\.smartrecruiters\.com\/v1\/companies)\/([a-zA-Z0-9_-]+)/i);
    if (srMatch && srMatch[1]) {
      return {
        provider: 'smartrecruiters',
        slug: srMatch[1],
        sourceUrl: url,
        confidence: 95,
      };
    }

    // 6. Recruitee
    // Patterns: {slug}.recruitee.com
    const recruiteeMatch = combined.match(/([a-zA-Z0-9_-]+)\.recruitee\.com/i);
    if (recruiteeMatch && recruiteeMatch[1] && recruiteeMatch[1] !== 'api') {
      return {
        provider: 'recruitee',
        slug: recruiteeMatch[1],
        sourceUrl: url,
        confidence: 90,
      };
    }

    // 7. Personio
    // Patterns: {slug}.jobs.personio.de, {slug}.personio.de
    const personioMatch = combined.match(/([a-zA-Z0-9_-]+)\.(?:jobs\.)?personio\.(?:de|com)/i);
    if (personioMatch && personioMatch[1]) {
      return {
        provider: 'personio',
        slug: personioMatch[1],
        sourceUrl: url,
        confidence: 90,
      };
    }

    // 8. Breezy HR
    // Patterns: {slug}.breezy.hr
    const breezyMatch = combined.match(/([a-zA-Z0-9_-]+)\.breezy\.hr/i);
    if (breezyMatch && breezyMatch[1] && breezyMatch[1] !== 'app') {
      return {
        provider: 'breezy',
        slug: breezyMatch[1],
        sourceUrl: url,
        confidence: 90,
      };
    }

    // 9. Teamtailor
    // Patterns: {slug}.teamtailor.com
    const teamtailorMatch = combined.match(/([a-zA-Z0-9_-]+)\.teamtailor\.com/i);
    if (teamtailorMatch && teamtailorMatch[1] && teamtailorMatch[1] !== 'api') {
      return {
        provider: 'teamtailor',
        slug: teamtailorMatch[1],
        sourceUrl: url,
        confidence: 90,
      };
    }

    // 10. Rippling
    // Patterns: ats.rippling.com/{slug}, rippling.com/ats/{slug}
    const ripplingMatch = combined.match(/(?:ats\.rippling\.com|rippling\.com\/ats|api\.rippling\.com\/platform\/api\/ats\/v1\/board)\/([a-zA-Z0-9_-]+)/i);
    if (ripplingMatch && ripplingMatch[1]) {
      return {
        provider: 'rippling',
        slug: ripplingMatch[1],
        sourceUrl: url,
        confidence: 90,
      };
    }

    // 11. Workday
    // Patterns: {tenant}.wd5.myworkdayjobs.com/{careerSite} or {tenant}.myworkdayjobs.com/{careerSite}
    const workdayMatch = combined.match(/([a-zA-Z0-9_-]+(?:\.wd\d+)?)\.myworkdayjobs\.com\/(?:[a-zA-Z_-]+\/)?([a-zA-Z0-9_-]+)/i);
    if (workdayMatch && workdayMatch[1] && workdayMatch[2]) {
      return {
        provider: 'workday',
        slug: `${workdayMatch[1]}/${workdayMatch[2]}`,
        sourceUrl: url,
        confidence: 85,
      };
    }

    return null;
  }
}

export const atsDetector = new AtsDetector();

