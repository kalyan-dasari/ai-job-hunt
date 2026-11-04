import { Job, WorkArrangement, EmploymentType, ExperienceLevel, VerificationReport } from '../../src/types/job.ts';
import { RawSourceJob } from './types.ts';

// Clean tracking parameters to produce clean canonical URLs
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'source',
      'fbclid',
      'gclid',
      'mc_cid',
      'mc_eid',
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    let cleaned = parsed.toString().replace(/\/$/, '');
    if (cleaned.endsWith('?')) cleaned = cleaned.slice(0, -1);
    return cleaned;
  } catch {
    return trimmed;
  }
}

export function parseSalaryString(text: string): { min?: number; max?: number; currency: string } {
  const numbers = text.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
  const currency = text.includes('₹') || text.toLowerCase().includes('inr') ? 'INR' : 'USD';
  return {
    min: numbers && numbers.length > 0 ? parseFloat(numbers[0]) : undefined,
    max: numbers && numbers.length > 1 ? parseFloat(numbers[1]) : undefined,
    currency,
  };
}

export function sanitizeAndCanonicalizeUrl(rawUrl: string): { originalUrl: string; canonicalUrl: string } {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { originalUrl: 'https://example.com/careers', canonicalUrl: 'https://example.com/careers' };
  }

  const trimmed = rawUrl.trim();
  const canonicalUrl = sanitizeUrl(trimmed);
  return { originalUrl: trimmed, canonicalUrl };
}

// Infer work arrangement from text clues
export function normalizeWorkArrangement(raw?: string, location?: string, description?: string): WorkArrangement {
  const combined = `${raw || ''} ${location || ''} ${description ? description.slice(0, 300) : ''}`.toLowerCase();
  if (combined.includes('remote') || combined.includes('work from home') || combined.includes('wfh')) {
    return 'Remote';
  }
  if (combined.includes('hybrid')) {
    return 'Hybrid';
  }
  if (combined.includes('on-site') || combined.includes('onsite') || combined.includes('in-office') || combined.includes('in office')) {
    return 'On-site';
  }
  return 'Hybrid';
}

export const INDIAN_TECH_CITIES = [
  'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'pune', 'mumbai',
  'delhi', 'noida', 'gurgaon', 'gurugram', 'new delhi', 'kolkata',
  'ahmedabad', 'chandigarh', 'kochi', 'coimbatore', 'jaipur', 'indore',
  'thiruvananthapuram', 'mysore', 'nagpur', 'bhubaneswar', 'india'
];

export function isIndiaEligibleJob(
  location?: string,
  description?: string,
  countryCode?: string
): { eligible: boolean; isRemote: boolean; matchedLocation?: string } {
  const loc = (location || '').toLowerCase().trim();
  const desc = (description || '').slice(0, 500).toLowerCase();
  const cCode = (countryCode || '').toLowerCase().trim();

  // 1. Explicit country code check
  if (cCode === 'in' || cCode === 'ind' || cCode === 'india') {
    return { eligible: true, isRemote: loc.includes('remote'), matchedLocation: location };
  }

  // 2. Check for explicit Indian city / territory match
  for (const city of INDIAN_TECH_CITIES) {
    if (loc.includes(city) || desc.includes(`in ${city}`) || desc.includes(`at ${city}`)) {
      return { eligible: true, isRemote: loc.includes('remote'), matchedLocation: city };
    }
  }

  // 3. Remote jobs: only if explicitly worldwide or eligible for India
  const isGenericRemote = loc.includes('remote') || loc.includes('anywhere') || loc.includes('wfh');
  if (isGenericRemote) {
    const nonIndiaRestrictions = ['us only', 'united states only', 'must reside in the us', 'uk only', 'canada only', 'europe only'];
    const hasRestriction = nonIndiaRestrictions.some((r) => loc.includes(r) || desc.includes(r));
    if (hasRestriction) {
      return { eligible: false, isRemote: true };
    }
    return { eligible: true, isRemote: true, matchedLocation: 'Remote (India Eligible)' };
  }

  // 4. Preserve unknown / not specified locations for candidate review
  if (!loc || loc === 'not specified' || loc === 'unknown' || loc === 'flexible') {
    return { eligible: true, isRemote: false, matchedLocation: 'Location Review Pending' };
  }

  return { eligible: false, isRemote: false };
}

// Normalize employment type
export function normalizeEmploymentType(raw?: string, title?: string): EmploymentType {
  const combined = `${raw || ''} ${title || ''}`.toLowerCase();
  if (combined.includes('intern') || combined.includes('trainee') || combined.includes('apprentice')) {
    return 'Internship';
  }
  if (combined.includes('part-time') || combined.includes('part time')) {
    return 'Part-time';
  }
  if (combined.includes('contract') || combined.includes('freelance') || combined.includes('consultant')) {
    return 'Contract';
  }
  return 'Full-time';
}

// Normalize experience level and years
export function normalizeExperienceLevel(
  raw?: string,
  minExp?: number,
  title?: string
): { level: ExperienceLevel; minYears: number; maxYears: number } {
  const text = `${raw || ''} ${title || ''}`.toLowerCase();

  if (text.includes('intern') || text.includes('trainee')) {
    return { level: 'Intern', minYears: 0, maxYears: 1 };
  }
  if (text.includes('lead') || text.includes('principal') || text.includes('director') || text.includes('staff')) {
    return { level: 'Lead', minYears: minExp || 8, maxYears: Math.max(12, (minExp || 8) + 4) };
  }
  if (text.includes('senior') || text.includes('sr.') || text.includes('sr ') || (minExp && minExp >= 5)) {
    return { level: 'Senior', minYears: minExp || 5, maxYears: Math.max(8, (minExp || 5) + 3) };
  }
  if (text.includes('entry') || text.includes('junior') || text.includes('jr.') || text.includes('associate') || (minExp && minExp <= 2)) {
    return { level: 'Entry', minYears: minExp || 0, maxYears: Math.max(2, (minExp || 0) + 2) };
  }

  // Default Mid-level
  return { level: 'Mid', minYears: minExp || 3, maxYears: Math.max(5, (minExp || 3) + 3) };
}

// Clean title
export function cleanJobTitle(rawTitle: string): string {
  if (!rawTitle) return 'Software Engineer';
  return rawTitle
    .replace(/^(\s*urgent|\s*immediate\s+hiring!?|\s*hiring:?|\s*wanted:?)\s*/gi, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Clean company name
export function cleanCompanyName(rawCompany: string): string {
  if (!rawCompany || rawCompany.trim().length === 0) {
    return 'Confidential Employer';
  }
  return rawCompany
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Normalize skills array
export function normalizeSkills(skills?: string[], description?: string): string[] {
  const skillSet = new Set<string>();

  if (Array.isArray(skills)) {
    skills.forEach((s) => {
      if (typeof s === 'string' && s.trim().length > 0) {
        skillSet.add(s.trim());
      }
    });
  }

  if (skillSet.size === 0 && description) {
    // Extract known technical keywords if provider gave none
    const common = [
      'TypeScript', 'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'Go', 'Docker',
      'AWS', 'Kubernetes', 'SQL', 'PostgreSQL', 'MongoDB', 'REST APIs', 'GraphQL', 'Tailwind',
    ];
    const descLower = description.toLowerCase();
    common.forEach((c) => {
      if (descLower.includes(c.toLowerCase())) {
        skillSet.add(c);
      }
    });
  }

  return skillSet.size > 0 ? Array.from(skillSet) : ['General Engineering'];
}

// Main Normalization Pipeline
export function normalizeRawJob(raw: RawSourceJob, existingId?: string): Job {
  const id = existingId || `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const title = cleanJobTitle(raw.title);
  const company = cleanCompanyName(raw.company);
  const { originalUrl, canonicalUrl } = sanitizeAndCanonicalizeUrl(raw.url);

  const arrangement = normalizeWorkArrangement(raw.workArrangement, raw.location, raw.description);
  const employmentType = normalizeEmploymentType(raw.employmentType, raw.title);
  const exp = normalizeExperienceLevel(raw.experienceLevel, raw.minExpYears, raw.title);
  const requiredSkills = normalizeSkills(raw.skills, raw.description);

  // Normalize salary displayText if provided
  let salary: Job['salary'] = undefined;
  if (raw.salaryMin || raw.salaryMax || raw.salaryText) {
    let min = raw.salaryMin;
    let max = raw.salaryMax;
    let currency = raw.salaryCurrency || (raw.salaryText?.includes('₹') ? 'INR' : 'USD');

    if ((min === undefined || max === undefined) && raw.salaryText) {
      const parsed = parseSalaryString(raw.salaryText);
      min = min ?? parsed.min;
      max = max ?? parsed.max;
      currency = raw.salaryCurrency || parsed.currency;
    }

    salary = {
      min,
      max,
      currency,
      period: 'yearly',
      disclosed: true,
      displayText: raw.salaryText || `${min || ''} - ${max || ''} ${currency}`.trim(),
    };
  }

  const now = new Date().toISOString();
  const datePosted = raw.postedDate
    ? new Date(raw.postedDate).toISOString().split('T')[0]
    : now.split('T')[0];

  const verificationReport: VerificationReport = {
    status: raw.sourceName === 'Career Page' ? 'Verified' : 'Needs Review',
    confidence: raw.sourceName === 'Career Page' ? 85 : 65,
    lastChecked: now,
    summary:
      raw.sourceName === 'Career Page'
        ? 'Directly sourced from verified corporate career portal.'
        : `Ingested via ${raw.sourceName}. Corroboration with primary company channel pending.`,
    checks: [
      {
        id: `chk-norm-1`,
        name: 'Source Attribution',
        passed: true,
        severity: 'info',
        details: `Identified on ${raw.sourceName} feed.`,
        sourceChecked: raw.sourceName,
      },
      {
        id: `chk-norm-2`,
        name: 'URL Protocol Validation',
        passed: originalUrl.startsWith('https://'),
        severity: originalUrl.startsWith('https://') ? 'info' : 'warning',
        details: originalUrl.startsWith('https://') ? 'Secure HTTPS endpoint confirmed.' : 'HTTP link detected.',
      },
    ],
    evidence: [`Discovered via ${raw.sourceName} adapter: ${canonicalUrl}`],
    warnings: raw.sourceName !== 'Career Page' ? ['Verify company requisitions directly before submitting sensitive data'] : [],
  };

  return {
    id,
    title,
    company,
    companyLogo: raw.companyLogo,
    location: (raw.location && raw.location.trim().length > 0) ? raw.location.trim() : 'Not Specified',
    workArrangement: arrangement,
    employmentType,
    experienceLevel: exp.level,
    minExpYears: exp.minYears,
    maxExpYears: exp.maxYears,
    salary,
    description: (raw.description && raw.description.trim().length > 0) ? raw.description.trim() : `${title} at ${company}.`,
    responsibilities: raw.responsibilities && raw.responsibilities.length > 0 ? raw.responsibilities : ['Collaborate on software architecture and product delivery.'],
    requiredSkills,
    preferredSkills: raw.preferredSkills || [],
    source: raw.sourceName,
    sourceJobId: raw.externalId || `${raw.sourceName.toLowerCase()}-${id}`,
    originalUrl,
    canonicalUrl,
    datePosted,
    lastChecked: now,
    isStartup: !!raw.isStartup,
    verificationReport,
    isSaved: false,
    isDismissed: false,
    isDuplicate: false,
  };
}
