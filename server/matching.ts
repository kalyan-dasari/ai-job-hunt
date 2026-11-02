import { CandidateProfile } from '../src/types/candidate';
import { Job, MatchResult } from '../src/types/job';
import { isIndiaEligibleJob } from './job-sources/normalizer.ts';

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

  // 2. Experience Compatibility & Fresher Eligibility
  const candidateYears = estimateCandidateExperienceYears(profile);
  const minJobExp = job.minExpYears !== undefined
    ? job.minExpYears
    : job.experienceLevel === 'Intern' || job.experienceLevel === 'Entry'
    ? 0
    : job.experienceLevel === 'Senior'
    ? 5
    : 2;

  const isFresher = candidateYears <= 1;
  const isFresherEligible =
    minJobExp <= 1 ||
    job.experienceLevel === 'Intern' ||
    job.experienceLevel === 'Entry' ||
    job.employmentType === 'Internship';

  let expScore = 85;
  let experienceExplanation = '';

  if (isFresher) {
    if (isFresherEligible) {
      expScore = 95;
      experienceExplanation = `Candidate profile has ${candidateYears} yrs experience. Role is fresher/entry eligible (min requirement: ${minJobExp} yrs).`;
    } else {
      expScore = Math.max(25, Math.round(100 - minJobExp * 16));
      experienceExplanation = `Role requests minimum ${minJobExp}+ yrs experience. Early-career candidates may encounter strict qualification screening.`;
    }
  } else {
    if (candidateYears >= minJobExp) {
      expScore = 95;
      experienceExplanation = `Candidate has ~${candidateYears} yrs experience, comfortably satisfying the ${minJobExp}+ yrs requirement.`;
    } else {
      const gap = minJobExp - candidateYears;
      expScore = Math.max(35, Math.round(90 - gap * 18));
      experienceExplanation = `Position asks for ${minJobExp}+ yrs experience; candidate profile indicates ~${candidateYears} yrs.`;
    }
  }

  // 3. Job-Title Relevance
  const titleLower = (job.title || '').toLowerCase();
  const headlineLower = (profile.headline || '').toLowerCase();
  const preferredRolesLower = (profile.preferredRoles || []).map((r) => r.toLowerCase());

  let titleRelevance = 75;
  if (preferredRolesLower.some((r) => titleLower.includes(r) || r.includes(titleLower))) {
    titleRelevance = 98;
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

  if (isRemote) {
    locationScore = 98;
    locationNote = 'Remote arrangement explicitly compatible with India.';
  } else if (preferredLocs.length === 0 || preferredLocs.some((loc) => jobLocLower.includes(loc.split(' ')[0]))) {
    locationScore = 95;
    locationNote = `Location (${job.location}) directly matches candidate preferred cities.`;
  } else if (indiaCheck.eligible) {
    locationScore = 85;
    locationNote = `Domestic Indian opportunity in ${job.location}.`;
  }

  // 5. Education Requirements
  const candidateDegrees = (profile.education || []).map((e) => (e.degree || '').toLowerCase()).join(' ');
  let educationScore = 88;
  if (candidateDegrees.includes('b.tech') || candidateDegrees.includes('b.e.') || candidateDegrees.includes('mca') || candidateDegrees.includes('computer')) {
    educationScore = 95;
  }

  // 6. Domain Relevance
  const domainScore = 85;

  // 7. Mandatory Requirements Verification
  const eligibilityConcerns: string[] = [];
  let mandatoryRequirementsMet = true;

  if (minJobExp >= 4 && isFresher) {
    eligibilityConcerns.push(`Mandatory experience barrier: Senior position demands ${minJobExp}+ years.`);
    mandatoryRequirementsMet = false;
  }

  if (required.length >= 3 && matchedSkillsCount === 0) {
    eligibilityConcerns.push('Core skills gap: Profile does not list required primary technical skills.');
    mandatoryRequirementsMet = false;
  }

  // Composite Overall Score (Weighted)
  let overall = Math.round(
    technicalScore * 0.40 +
    expScore * 0.25 +
    titleRelevance * 0.15 +
    locationScore * 0.10 +
    educationScore * 0.10
  );

  // If hard mandatory qualification barriers exist, cap score honestly
  if (!mandatoryRequirementsMet) {
    overall = Math.min(overall, 52);
  } else {
    overall = Math.min(100, Math.max(25, overall));
  }

  // Risk Audit Heuristic (Separate from independent verification)
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
    recommendations.push('Fresher-friendly: Emphasize practical academic projects and GitHub portfolio.');
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
    explanation: `Candidate matches ${matchedSkillsCount}/${required.length} required skills (${strongMatches.slice(0, 3).join(', ') || 'foundation'}). ${experienceExplanation}`,
    recommendations,
    calculatedAt: new Date().toISOString(),
    experienceExplanation,
    isFresherEligible,
    fresherExplanation: isFresherEligible
      ? 'Entry-level / Fresher eligible position.'
      : `Requires ${minJobExp}+ years experience.`,
    locationCompatibilityNote: locationNote,
    riskAssessment,
    mandatoryRequirementsMet,
  };

  matchCache.set(cacheKey, result);
  return result;
}

// Alias for Dossier naming consistency
export const calculateDossierMatch = calculateDeterministicMatch;
