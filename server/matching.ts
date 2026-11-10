import { CandidateProfile } from '../src/types/candidate';
import { Job, MatchResult, FresherStatus, LocationCategory } from '../src/types/job';
import { isIndiaEligibleJob, evaluateTargetRole } from './job-sources/normalizer.ts';

// In-memory match cache to avoid redundant evaluation cycles
const matchCache = new Map<string, MatchResult>();

// Estimate total years of professional experience from profile experience list
export function estimateCandidateExperienceYears(profile: CandidateProfile): number {
  if (!profile.experience || profile.experience.length === 0) {
    return 0;
  }

  let totalMonths = 0;
  for (const exp of profile.experience) {
    if (!exp.startDate) continue;
    try {
      const start = new Date(exp.startDate).getTime();
      const end = exp.current || !exp.endDate ? Date.now() : new Date(exp.endDate).getTime();
      const months = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.4375)));
      totalMonths += months;
    } catch {
      totalMonths += 12;
    }
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}

export function calculateDeterministicMatch(profile: CandidateProfile, job: Job): MatchResult {
  const cacheKey = `${profile.id || 'candidate'}::${profile.updatedAt || ''}::${job.id}::${job.lastChecked || ''}`;
  const cached = matchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const profileSkillsLower = (profile.skills || []).map((s) => s.toLowerCase());
  const required = job.requiredSkills || [];
  const preferred = job.preferredSkills || [];

  // 1. Technical Skills Match
  let matchedSkillsCount = 0;
  const strongMatches: string[] = [];
  const missingSkills: string[] = [];

  required.forEach((skill) => {
    const sl = skill.toLowerCase();
    const hasSkill = profileSkillsLower.some(
      (ps) => ps === sl || ps.includes(sl) || sl.includes(ps) || (sl.includes('react') && ps.includes('react'))
    );
    if (hasSkill) {
      matchedSkillsCount++;
      strongMatches.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const technicalScore =
    required.length > 0 ? Math.round((matchedSkillsCount / required.length) * 100) : 80;

  // 2. Experience Compatibility & Strict Eligibility Evaluation
  const candidateYears = estimateCandidateExperienceYears(profile);
  const isFresher = candidateYears <= 1;

  // Determine job experience requirement and fresher eligibility
  const minJobExp = job.minExpYears !== undefined
    ? job.minExpYears
    : job.experienceLevel === 'Intern' || job.experienceLevel === 'Entry'
    ? 0
    : job.experienceLevel === 'Senior'
    ? 5
    : job.experienceLevel === 'Lead'
    ? 8
    : job.experienceLevel === 'Unclear'
    ? undefined
    : 3;

  let fresherStatus: FresherStatus = job.fresherStatus || 'Unclear';
  if (fresherStatus === 'Unclear') {
    if (
      job.experienceLevel === 'Intern' ||
      job.experienceLevel === 'Entry' ||
      job.employmentType === 'Internship' ||
      (minJobExp !== undefined && minJobExp <= 1)
    ) {
      fresherStatus = 'Fresher';
    } else if (
      job.experienceLevel === 'Senior' ||
      job.experienceLevel === 'Lead' ||
      (minJobExp !== undefined && minJobExp >= 3)
    ) {
      fresherStatus = 'Experienced';
    }
  }

  const isFresherEligible = fresherStatus === 'Fresher';

  let expScore = 80;
  let experienceExplanation = '';
  let mandatoryRequirementsMet = true;
  const eligibilityConcerns: string[] = [];
  let scoreCap = 100;

  if (isFresher) {
    if (isFresherEligible) {
      expScore = 98;
      experienceExplanation = `Candidate profile has ${candidateYears} yrs experience. Role is verified fresher/entry eligible (min requirement: ${minJobExp ?? 0} yrs).`;
      mandatoryRequirementsMet = true;
      scoreCap = 100;
    } else if (fresherStatus === 'Unclear') {
      expScore = 65;
      experienceExplanation = `Experience requirement not explicitly specified in posting. Candidate review recommended before applying.`;
      mandatoryRequirementsMet = true;
      scoreCap = 68; // Never outranks verified fresher matches
    } else {
      // Experienced / Senior role for a fresher candidate
      mandatoryRequirementsMet = false;
      const barrierYears = minJobExp || 5;
      eligibilityConcerns.push(`Mandatory experience barrier: Senior position demands ${barrierYears}+ years.`);
      expScore = Math.max(10, Math.round(45 - barrierYears * 5));
      experienceExplanation = `Strict qualification barrier: Demands ${barrierYears}+ yrs experience; candidate is early-career/fresher (~${candidateYears} yrs).`;
      // Senior positions requiring years of experience must NOT appear above suitable fresher positions
      scoreCap = barrierYears >= 7 ? 28 : barrierYears >= 4 ? 35 : 42;
    }
  } else {
    // Experienced candidate
    const targetMin = minJobExp ?? 2;
    if (candidateYears >= targetMin) {
      expScore = 95;
      experienceExplanation = `Candidate has ~${candidateYears} yrs experience, comfortably satisfying the ${targetMin}+ yrs requirement.`;
    } else {
      const gap = targetMin - candidateYears;
      expScore = Math.max(35, Math.round(90 - gap * 18));
      experienceExplanation = `Position asks for ${targetMin}+ yrs experience; candidate profile indicates ~${candidateYears} yrs.`;
      if (gap >= 3) {
        mandatoryRequirementsMet = false;
        eligibilityConcerns.push(`Experience shortfall: Requires ${targetMin}+ yrs; candidate has ~${candidateYears} yrs.`);
        scoreCap = 50;
      }
    }
  }

  // 3. Priority Role Match
  const titleLower = (job.title || '').toLowerCase();
  const headlineLower = (profile.headline || '').toLowerCase();
  const preferredRolesLower = (profile.preferredRoles || []).map((r) => r.toLowerCase());
  const targetRoleEval = evaluateTargetRole(job.title);

  let titleRelevance = 75;
  if (preferredRolesLower.some((r) => titleLower.includes(r) || r.includes(titleLower))) {
    titleRelevance = 98;
  } else if (targetRoleEval.isTargetRole) {
    titleRelevance = 95; // Boost priority candidate target roles (Python, React, Full Stack, SDE, AI/ML, GET)
  } else if (headlineLower && (titleLower.includes(headlineLower) || headlineLower.includes(titleLower))) {
    titleRelevance = 92;
  } else if (titleLower.includes('software') || titleLower.includes('developer') || titleLower.includes('engineer')) {
    titleRelevance = 80;
  }

  // 4. Location & Remote Compatibility
  const preferredLocs = (profile.preferredLocations || []).map((l) => l.toLowerCase());
  const jobLocLower = (job.location || '').toLowerCase();
  const isRemote = job.workArrangement === 'Remote' || jobLocLower.includes('remote');
  const indiaCheck = isIndiaEligibleJob(job.location, job.description);

  let locationScore = 80;
  let locationNote = 'Standard on-site or hybrid arrangement.';
  const locCat: LocationCategory = (job.locationCategory as LocationCategory) || (indiaCheck.category as LocationCategory) || 'Unknown';

  if (locCat === 'India remote' || locCat === 'International remote explicitly open to India') {
    locationScore = 98;
    locationNote = 'Remote arrangement explicitly compatible with India.';
  } else if (preferredLocs.length === 0 || preferredLocs.some((loc) => jobLocLower.includes(loc.split(' ')[0]))) {
    locationScore = 95;
    locationNote = `Location (${job.location}) directly matches candidate preferred cities (Hyderabad/Bengaluru/Pune/Chennai).`;
  } else if (indiaCheck.eligible) {
    locationScore = 88;
    locationNote = `Domestic Indian opportunity in ${job.location}.`;
  } else {
    locationScore = 30;
    locationNote = `International or unconfirmed location (${job.location}).`;
    eligibilityConcerns.push(`Location concern: Posting outside primary India geographic preference.`);
  }

  // 5. Education Requirements
  const candidateDegrees = (profile.education || []).map((e) => (e.degree || '').toLowerCase()).join(' ');
  let educationScore = 88;
  if (candidateDegrees.includes('b.tech') || candidateDegrees.includes('b.e.') || candidateDegrees.includes('mca') || candidateDegrees.includes('computer')) {
    educationScore = 95;
  }

  // 6. Domain & Industry Relevance
  let domainScore = 85;
  let industryFitNote: string | undefined;
  if (profile.preferredIndustries && profile.preferredIndustries.length > 0) {
    const jobInd = (job.startupMetadata?.industry || '').toLowerCase();
    const matchesIndustry = profile.preferredIndustries.some(
      (ind) => jobInd.includes(ind.toLowerCase()) || descLower.includes(ind.toLowerCase())
    );
    if (matchesIndustry) {
      domainScore = 95;
      industryFitNote = `Industry matches preferred sectors (${profile.preferredIndustries.join(', ')}).`;
    }
  }

  // 7. Salary Alignment Evaluation (Truthful - Never invented)
  let salaryFitNote: string = 'Salary undisclosed by employer';
  if (job.salary && (job.salary.min || job.salary.max || job.salary.displayText)) {
    const maxVal = job.salary.max || job.salary.min || 0;
    if (profile.minExpectedSalary && profile.minExpectedSalary > 0) {
      if (maxVal > 0 && maxVal >= profile.minExpectedSalary) {
        salaryFitNote = `Published compensation meets candidate expected range (${job.salary.displayText || `${job.salary.currency} ${maxVal}`}).`;
      } else if (maxVal > 0) {
        salaryFitNote = `Published compensation (${job.salary.displayText || `${job.salary.currency} ${maxVal}`}) below requested target (${profile.minExpectedSalary}).`;
      } else {
        salaryFitNote = `Published salary: ${job.salary.displayText || 'Disclosed'}.`;
      }
    } else {
      salaryFitNote = `Published salary: ${job.salary.displayText || `${job.salary.currency} ${maxVal}`}.`;
    }
  }

  // 8. Work Arrangement & Type Compatibility
  let arrangementBonus = 0;
  if (profile.preferredArrangements && profile.preferredArrangements.length > 0) {
    if (profile.preferredArrangements.includes(job.workArrangement)) {
      arrangementBonus += 2;
    }
  }
  if (profile.preferredTypes && profile.preferredTypes.length > 0) {
    if (profile.preferredTypes.includes(job.employmentType)) {
      arrangementBonus += 2;
    }
  }

  if (required.length >= 3 && matchedSkillsCount === 0) {
    eligibilityConcerns.push('Core skills gap: Profile does not list required primary technical skills.');
    mandatoryRequirementsMet = false;
    scoreCap = Math.min(scoreCap, 48);
  }

  // Composite Weighted Score
  let overall = Math.round(
    technicalScore * 0.35 +
    expScore * 0.30 +
    titleRelevance * 0.15 +
    locationScore * 0.10 +
    educationScore * 0.10
  );

  overall += arrangementBonus;

  // Freshness bonus: +3 points if posted within last 7 days
  const postedMs = job.datePosted ? new Date(job.datePosted).getTime() : 0;
  const isFresh = postedMs > 0 && Date.now() - postedMs < 7 * 24 * 60 * 60 * 1000;
  if (isFresh) {
    overall += 3;
  }

  // Apply hard eligibility cap
  overall = Math.min(scoreCap, Math.max(15, overall));

  // Risk Audit Heuristic
  const descLower = (job.description || '').toLowerCase();
  let riskAssessment = 'Listing follows standard corporate requisition formatting.';
  if (descLower.includes('telegram') || descLower.includes('registration fee') || descLower.includes('whatsapp only')) {
    riskAssessment = 'Potential Risk: Listing mentions external chat groups or fees. Exercise standard caution.';
  }

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Highlight transferable projects or foundational coursework in ${missingSkills.slice(0, 2).join(' and ')} in your application.`
    );
  } else {
    recommendations.push('Strong core technical alignment. Prepare tailored materials and submit application.');
  }

  if (isFresher && isFresherEligible) {
    recommendations.push('Fresher-friendly: Emphasize practical academic projects, internships, and GitHub portfolio.');
  }

  // Transparent explanation of why job is recommended or restricted
  let explanationSummary = '';
  if (isFresher && isFresherEligible) {
    explanationSummary = `Recommended: Fully eligible for entry-level / freshers (${job.minExpYears || 0}-${job.maxExpYears || 1} yrs req). Matches ${matchedSkillsCount}/${required.length} required skills (${strongMatches.slice(0, 3).join(', ') || 'core'}). Located in ${job.location}.`;
  } else if (isFresher && fresherStatus === 'Unclear') {
    explanationSummary = `Neutral fit: Experience requirements unspecified (Unclear). Skill match: ${matchedSkillsCount}/${required.length}. Review full requirements before applying.`;
  } else if (isFresher && !mandatoryRequirementsMet) {
    explanationSummary = `Restricted match: Demands ${minJobExp || 5}+ yrs experience. Candidate is early-career / fresher. Overall score capped at ${overall}%.`;
  } else {
    explanationSummary = `Matches ${matchedSkillsCount}/${required.length} required skills (${strongMatches.slice(0, 3).join(', ') || 'foundation'}). ${experienceExplanation}`;
  }

  const result: MatchResult = {
    overallScore: overall,
    dimensions: {
      technicalSkills: technicalScore,
      relevantExperience: expScore,
      projectRelevance: domainScore,
      educationAndCerts: educationScore,
      locationAndArrangement: locationScore,
      seniorityFit: expScore,
      domainRelevance: domainScore,
      titleRelevance,
    },
    strongMatches: strongMatches.length > 0 ? strongMatches : ['General engineering foundation'],
    missingSkills,
    eligibilityConcerns,
    explanation: explanationSummary,
    recommendations,
    calculatedAt: new Date().toISOString(),
    experienceExplanation,
    isFresherEligible,
    fresherStatus,
    fresherExplanation: isFresherEligible
      ? 'Entry-level / Fresher eligible position.'
      : fresherStatus === 'Unclear'
      ? 'Experience requirement not specified (Unclear).'
      : `Requires ${minJobExp || 3}+ years experience.`,
    locationCompatibilityNote: locationNote,
    locationCategory: locCat,
    salaryFitNote,
    industryFitNote,
    riskAssessment,
    mandatoryRequirementsMet,
  };

  matchCache.set(cacheKey, result);
  return result;
}

// Alias for Dossier naming consistency
export const calculateDossierMatch = calculateDeterministicMatch;
