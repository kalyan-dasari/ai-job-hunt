import { CandidateProfile } from '../src/types/candidate';
import { Job, MatchResult } from '../src/types/job';

export function calculateDeterministicMatch(profile: CandidateProfile, job: Job): MatchResult {
  const profileSkillsLower = (profile.skills || []).map((s) => s.toLowerCase());
  const required = job.requiredSkills || [];

  let matchedSkillsCount = 0;
  const strongMatches: string[] = [];
  const missingSkills: string[] = [];

  required.forEach((skill) => {
    const sl = skill.toLowerCase();
    const hasSkill = profileSkillsLower.some(
      (ps) => ps.includes(sl) || sl.includes(ps) || (sl.includes('react') && ps.includes('react'))
    );
    if (hasSkill) {
      matchedSkillsCount++;
      strongMatches.push(skill);
    } else {
      missingSkills.push(skill);
    }
  });

  const skillScore = required.length > 0 ? Math.round((matchedSkillsCount / required.length) * 100) : 80;
  const expFit = 85;
  const preferredLocs = profile.preferredLocations || [];
  const locFit = preferredLocs.length === 0 || preferredLocs.some((loc) =>
    job.location.toLowerCase().includes(loc.toLowerCase().split(' ')[0])
  )
    ? 95
    : 80;

  const overall = Math.min(
    100,
    Math.max(20, Math.round(skillScore * 0.45 + expFit * 0.25 + locFit * 0.15 + 85 * 0.15))
  );

  return {
    overallScore: overall,
    dimensions: {
      technicalSkills: skillScore,
      relevantExperience: expFit,
      projectRelevance: 88,
      educationAndCerts: 90,
      locationAndArrangement: locFit,
      seniorityFit: 85,
    },
    strongMatches: strongMatches.length > 0 ? strongMatches : ['General engineering background'],
    missingSkills: missingSkills,
    eligibilityConcerns: [],
    explanation: `Candidate possesses ${matchedSkillsCount} out of ${required.length} key required skills (${strongMatches.slice(0, 3).join(', ')}). Work arrangement and location align with preferences.`,
    recommendations: [
      missingSkills.length > 0
        ? `Consider demonstrating transferable experience in ${missingSkills.slice(0, 2).join(' and ')} in your application note.`
        : 'Strong alignment across core requirements. Proceed with application preparation.',
    ],
    calculatedAt: new Date().toISOString(),
  };
}
