import { Job, WorkArrangement, EmploymentType, ExperienceLevel, VerificationReport, FresherStatus, LocationCategory } from '../../src/types/job.ts';
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
  'thiruvananthapuram', 'trivandrum', 'mysore', 'mysuru', 'nagpur', 'bhubaneswar',
  'secunderabad', 'telangana', 'karnataka', 'tamil nadu', 'maharashtra', 'haryana',
  'uttar pradesh', 'kerala', 'west bengal', 'gujarat', 'india', 'in'
];

export interface LocationClassification {
  category: LocationCategory;
  eligible: boolean;
  isRemote: boolean;
  matchedLocation: string;
  reason: string;
}

export function classifyLocation(
  location?: string,
  description?: string,
  countryCode?: string
): LocationClassification {
  const loc = (location || '').toLowerCase().trim();
  const desc = (description || '').slice(0, 1000).toLowerCase();
  const cCode = (countryCode || '').toLowerCase().trim();

  // 1. Check for explicit India city/state match
  for (const city of INDIAN_TECH_CITIES) {
    if (loc.includes(city) || desc.includes(`in ${city}`) || desc.includes(`at ${city}`) || desc.includes(`based in ${city}`)) {
      const isRemote = loc.includes('remote') || loc.includes('wfh') || desc.includes('remote');
      if (isRemote) {
        return {
          category: 'India remote',
          eligible: true,
          isRemote: true,
          matchedLocation: location || `${city} (Remote)`,
          reason: `India Remote opportunity with affinity to ${city}.`,
        };
      }
      return {
        category: 'India city',
        eligible: true,
        isRemote: false,
        matchedLocation: location || city,
        reason: `Domestic Indian technology hub position in ${city}.`,
      };
    }
  }

  // 2. Explicit country code check
  if (cCode === 'in' || cCode === 'ind' || cCode === 'india') {
    const isRemote = loc.includes('remote') || loc.includes('wfh');
    return {
      category: isRemote ? 'India remote' : 'India city',
      eligible: true,
      isRemote,
      matchedLocation: location || 'India',
      reason: 'Explicit India national code match.',
    };
  }

  // 3. Remote jobs: strict international classification
  const isGenericRemote = loc.includes('remote') || loc.includes('anywhere') || loc.includes('wfh') || loc.includes('distributed');
  if (isGenericRemote) {
    // Non-India exclusions
    const nonIndiaRestrictions = [
      'us only', 'united states only', 'must reside in the us', 'uk only', 'canada only',
      'europe only', 'emea only', 'americas only', 'latin america only', 'latam only',
      'north america', 'australia only', 'germany only', 'france only', 'us time zone', 'est only', 'pst only'
    ];
    if (nonIndiaRestrictions.some((r) => loc.includes(r) || desc.includes(r))) {
      return {
        category: 'International location',
        eligible: false,
        isRemote: true,
        matchedLocation: location || 'International Remote',
        reason: 'Restricted to foreign geographic timezone/territory.',
      };
    }

    // Explicit worldwide / global open to India
    const worldwideSignals = ['worldwide', 'global', 'anywhere in the world', 'apac', 'open to india', 'hire globally'];
    if (worldwideSignals.some((s) => loc.includes(s) || desc.includes(s))) {
      return {
        category: 'International remote explicitly open to India',
        eligible: true,
        isRemote: true,
        matchedLocation: 'Global Remote (India Eligible)',
        reason: 'International remote position with explicit worldwide / APAC candidate eligibility.',
      };
    }

    // Generic remote WITHOUT India confirmation: Do NOT assume it is available to Indian applicants!
    return {
      category: 'Unknown',
      eligible: false,
      isRemote: true,
      matchedLocation: location || 'Remote (Unspecified Region)',
      reason: 'Generic remote posting without explicit confirmation of Indian applicant eligibility.',
    };
  }

  // 4. Missing or vague location
  if (!loc || loc === 'not specified' || loc === 'unknown' || loc === 'flexible') {
    return {
      category: 'Unknown',
      eligible: false,
      isRemote: false,
      matchedLocation: 'Unknown',
      reason: 'Unspecified geographic territory.',
    };
  }

  // 5. Default foreign location
  return {
    category: 'International location',
    eligible: false,
    isRemote: false,
    matchedLocation: location || 'International',
    reason: `International location (${location}) outside domestic India hiring scope.`,
  };
}

export function isIndiaEligibleJob(
  location?: string,
  description?: string,
  countryCode?: string
): { eligible: boolean; isRemote: boolean; matchedLocation?: string; category?: LocationCategory; reason?: string } {
  const result = classifyLocation(location, description, countryCode);
  return {
    eligible: result.eligible,
    isRemote: result.isRemote,
    matchedLocation: result.matchedLocation,
    category: result.category,
    reason: result.reason,
  };
}

// Priority Target Roles
export const TARGET_ROLE_PRIORITIES = [
  { role: 'Python Developer', keywords: ['python developer', 'python engineer', 'python backend', 'django', 'fastapi', 'flask'] },
  { role: 'Backend Developer', keywords: ['backend developer', 'backend engineer', 'server engineer', 'node.js developer', 'java backend', 'golang developer'] },
  { role: 'Full Stack Developer', keywords: ['full stack developer', 'full stack engineer', 'fullstack developer', 'fullstack engineer', 'full-stack'] },
  { role: 'React Developer', keywords: ['react developer', 'react engineer', 'react.js developer', 'frontend developer', 'front end developer', 'frontend engineer'] },
  { role: 'JavaScript Developer', keywords: ['javascript developer', 'javascript engineer', 'typescript developer', 'web developer'] },
  { role: 'Software Engineer', keywords: ['software engineer', 'software developer', 'sde', 'systems engineer', 'programmer'] },
  { role: 'AI Engineer', keywords: ['ai engineer', 'ai developer', 'artificial intelligence engineer', 'generative ai', 'llm engineer', 'ai agent'] },
  { role: 'Machine Learning Engineer', keywords: ['machine learning engineer', 'ml engineer', 'ml developer', 'deep learning'] },
  { role: 'Junior Data Analyst', keywords: ['junior data analyst', 'data analyst', 'business analyst', 'bi analyst', 'analytics engineer'] },
  { role: 'Graduate Engineer Trainee', keywords: ['graduate engineer trainee', 'get', 'graduate trainee', 'trainee engineer', 'engineering trainee'] },
  { role: 'Software Developer Intern', keywords: ['software developer intern', 'software engineering intern', 'sde intern', 'developer intern', 'tech intern'] },
  { role: 'AI/ML Intern', keywords: ['ai intern', 'ml intern', 'ai/ml intern', 'machine learning intern', 'data science intern'] },
  { role: 'Python Intern', keywords: ['python intern', 'python development intern', 'backend intern'] },
];

export function evaluateTargetRole(title: string): { isTargetRole: boolean; matchedRole?: string; category?: string } {
  const tl = title.toLowerCase();
  for (const item of TARGET_ROLE_PRIORITIES) {
    if (item.keywords.some((k) => tl.includes(k))) {
      return { isTargetRole: true, matchedRole: item.role, category: item.role };
    }
  }
  return { isTargetRole: false };
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

// Normalize experience level and years with explicit 'Unclear' support
export function normalizeExperienceLevel(
  raw?: string,
  minExp?: number,
  title?: string,
  description?: string
): {
  level: ExperienceLevel;
  minYears?: number;
  maxYears?: number;
  fresherStatus: FresherStatus;
  isFresherEligible: boolean;
  explanation: string;
} {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const combined = `${raw || ''} ${t} ${d.slice(0, 1500)}`;

  // 1. Explicit Internship / Trainee
  if (t.includes('intern') || t.includes('trainee') || t.includes('graduate') || t.includes('apprentice') || t.includes('get')) {
    return {
      level: 'Intern',
      minYears: 0,
      maxYears: 1,
      fresherStatus: 'Fresher',
      isFresherEligible: true,
      explanation: 'Designated internship or graduate trainee position (0-1 yrs).',
    };
  }

  // 2. Explicit Freshers or 0-1, 0-2 years in title or description
  const fresherPatterns = [
    /\b(?:0\s*[-–to]\s*[12]|0\s*[-–to]\s*1|0\s*[-–to]\s*2)\s*(?:years?|yrs?)/i,
    /\b(?:freshers?|fresh\s+graduates?|recent\s+graduates?|campus\s+hire|entry\s+level|college\s+graduates?)\b/i,
    /\b(?:1\s*[-–to]\s*2)\s*(?:years?|yrs?)\b/i,
  ];
  for (const pattern of fresherPatterns) {
    if (pattern.test(combined)) {
      return {
        level: 'Entry',
        minYears: 0,
        maxYears: 2,
        fresherStatus: 'Fresher',
        isFresherEligible: true,
        explanation: 'Explicitly mentions freshers, graduates, or 0–2 years experience requirement.',
      };
    }
  }

  // 3. Explicit Senior / Lead / Staff / Principal
  const seniorPatterns = [
    /\b(?:lead|principal|director|head\s+of|architect|staff)\b/i,
    /\b(?:senior|sr\.|sr\s)\b/i,
    /\b(?:[5-9]|1\d)\+?\s*(?:years?|yrs?)\b/i,
    /\b(?:4\s*[-–to]\s*[6-9])\s*(?:years?|yrs?)\b/i,
  ];
  if (seniorPatterns[0].test(t) || (minExp && minExp >= 7)) {
    return {
      level: 'Lead',
      minYears: minExp || 8,
      maxYears: Math.max(12, (minExp || 8) + 4),
      fresherStatus: 'Experienced',
      isFresherEligible: false,
      explanation: `Lead/Principal position requiring extensive senior leadership (min ${minExp || 8}+ yrs).`,
    };
  }
  if (seniorPatterns[1].test(t) || seniorPatterns[2].test(combined) || seniorPatterns[3].test(combined) || (minExp && minExp >= 4)) {
    return {
      level: 'Senior',
      minYears: minExp || 5,
      maxYears: Math.max(8, (minExp || 5) + 3),
      fresherStatus: 'Experienced',
      isFresherEligible: false,
      explanation: `Senior position requiring substantial professional experience (min ${minExp || 5}+ yrs).`,
    };
  }

  // 4. Mid-level explicit (3-5 years)
  const midPatterns = [
    /\b(?:[2-4]\s*[-–to]\s*[4-6]|\b[3-4]\+?\s*(?:years?|yrs?))\s*(?:of\s+)?experience/i,
    /\bmanager\b/i,
  ];
  if (midPatterns.some((p) => p.test(combined)) || (minExp && minExp >= 3)) {
    return {
      level: 'Mid',
      minYears: minExp || 3,
      maxYears: Math.max(5, (minExp || 3) + 2),
      fresherStatus: 'Experienced',
      isFresherEligible: false,
      explanation: `Mid-level position requiring minimum ${minExp || 3}+ years professional experience.`,
    };
  }

  // 5. Junior / Associate title
  if (t.includes('junior') || t.includes('jr.') || t.includes('jr ') || t.includes('associate')) {
    return {
      level: 'Entry',
      minYears: 0,
      maxYears: 2,
      fresherStatus: 'Fresher',
      isFresherEligible: true,
      explanation: 'Junior / Associate engineer title suitable for entry-level applicants.',
    };
  }

  // 6. Experience requirement is NOT specified:
  // "Do not automatically classify every job without an experience requirement as fresher-friendly. Use an unclear classification when appropriate."
  return {
    level: 'Unclear',
    minYears: undefined,
    maxYears: undefined,
    fresherStatus: 'Unclear',
    isFresherEligible: false,
    explanation: 'Experience requirement not specified in posting. Candidate should inspect full description.',
  };
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
  const exp = normalizeExperienceLevel(raw.experienceLevel, raw.minExpYears, raw.title, raw.description);
  const locClass = classifyLocation(raw.location, raw.description, raw.country);
  const roleEval = evaluateTargetRole(title);
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
    company: company,
    companyLogo: raw.companyLogo,
    companyWebsite: raw.companyWebsite,
    location: (raw.location && raw.location.trim().length > 0) ? raw.location.trim() : 'Not Specified',
    country: raw.country || 'India',
    workArrangement: arrangement,
    employmentType,
    experienceLevel: exp.level,
    minExpYears: exp.minYears,
    maxExpYears: exp.maxYears,
    fresherStatus: exp.fresherStatus,
    locationCategory: locClass.category,
    targetRoleCategory: roleEval.matchedRole,
    salary,
    description: (raw.description && raw.description.trim().length > 0) ? raw.description.trim() : `${title} at ${company}.`,
    responsibilities: raw.responsibilities && raw.responsibilities.length > 0 ? raw.responsibilities : ['Collaborate on software architecture and product delivery.'],
    requiredSkills,
    preferredSkills: raw.preferredSkills || [],
    source: raw.sourceName,
    sourceType: raw.sourceType || (raw.sourceName === 'JSON-LD' ? 'JSON-LD' : raw.sourceName === 'RSS Feed' ? 'RSS' : ['Greenhouse', 'Lever', 'Ashby', 'Workable', 'SmartRecruiters', 'Recruitee', 'Personio', 'Breezy HR', 'Teamtailor', 'Rippling', 'Workday'].includes(raw.sourceName) ? 'ATS' : 'CareerPage'),
    sourceJobId: raw.externalId || `${raw.sourceName.toLowerCase()}-${id}`,
    originalUrl,
    canonicalUrl,
    applicationUrl: raw.applicationUrl || originalUrl,
    datePosted,
    lastChecked: now,
    isStartup: !!raw.isStartup,
    verificationReport,
    isSaved: false,
    isDismissed: false,
    isDuplicate: false,
  };
}
