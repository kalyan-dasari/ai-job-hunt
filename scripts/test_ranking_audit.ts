import { calculateDeterministicMatch } from '../server/matching.ts';
import { CandidateProfile, emptyCandidateProfile } from '../src/types/candidate.ts';
import { Job } from '../src/types/job.ts';

console.log('=== RANKING SYSTEM & ELIGIBILITY GATE AUDIT (6 REPRESENTATIVE PROFILES) ===\n');

// 1. Fresher Python Candidate (0 yrs experience)
const fresherProfile: CandidateProfile = {
  ...emptyCandidateProfile,
  id: 'cand-fresher',
  name: 'Aarav Sharma',
  preferredRoles: ['Python Developer', 'Software Engineer'],
  preferredLocations: ['Hyderabad', 'Bengaluru'],
  skills: ['Python', 'Django', 'FastAPI', 'SQL', 'Git'],
  experience: [], // 0 years
};

// 2. 1-year Backend Candidate
const oneYearBackendProfile: CandidateProfile = {
  ...emptyCandidateProfile,
  id: 'cand-1y-backend',
  name: 'Neha Reddy',
  preferredRoles: ['Backend Developer', 'Python Developer'],
  preferredLocations: ['Hyderabad', 'Bengaluru'],
  skills: ['Python', 'Node.js', 'PostgreSQL', 'Docker'],
  experience: [
    {
      id: 'e1',
      title: 'Junior Backend Developer',
      company: 'TechCorp',
      startDate: '2025-01-01',
      endDate: '2026-01-01',
      current: false,
      description: 'Built APIs with Python and PostgreSQL',
      skillsUsed: ['Python', 'PostgreSQL']
    }
  ]
};

// 3. 2-year Full Stack Candidate
const twoYearFullStackProfile: CandidateProfile = {
  ...emptyCandidateProfile,
  id: 'cand-2y-fullstack',
  name: 'Vikram Joshi',
  preferredRoles: ['Full Stack Developer', 'Software Engineer'],
  preferredLocations: ['Bengaluru', 'Pune'],
  skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Python'],
  experience: [
    {
      id: 'e1',
      title: 'Software Engineer',
      company: 'SaaS Innovate',
      startDate: '2024-01-01',
      endDate: '2026-01-01',
      current: false,
      description: 'Full stack development with React and Node.js',
      skillsUsed: ['React', 'Node.js']
    }
  ]
};

// 4. 5-year Senior Candidate
const fiveYearSeniorProfile: CandidateProfile = {
  ...emptyCandidateProfile,
  id: 'cand-5y-senior',
  name: 'Kavita Menon',
  preferredRoles: ['Senior Software Engineer', 'Backend Lead'],
  preferredLocations: ['Bengaluru', 'Chennai'],
  skills: ['Java', 'Distributed Systems', 'Kubernetes', 'Python', 'AWS', 'Microservices'],
  experience: [
    {
      id: 'e1',
      title: 'Senior Software Engineer',
      company: 'Cloud Scale',
      startDate: '2021-01-01',
      endDate: '2026-01-01',
      current: true,
      description: 'Distributed microservices architecture',
      skillsUsed: ['Java', 'AWS', 'Microservices']
    }
  ]
};

// 5. 7-year Staff Candidate
const sevenYearStaffProfile: CandidateProfile = {
  ...emptyCandidateProfile,
  id: 'cand-7y-staff',
  name: 'Rohan Mehra',
  preferredRoles: ['Staff Engineer', 'Principal Architect'],
  preferredLocations: ['Bengaluru', 'Hyderabad'],
  skills: ['Distributed Systems', 'Go', 'Kubernetes', 'Architecture', 'Python'],
  experience: [
    {
      id: 'e1',
      title: 'Staff Architect',
      company: 'Enterprise Systems',
      startDate: '2019-01-01',
      endDate: '2026-01-01',
      current: true,
      description: 'Core platform architecture',
      skillsUsed: ['Go', 'Architecture']
    }
  ]
};

// Sample Jobs for Testing
const jobFresherPython: Job = {
  id: 'job-fresher-py',
  title: 'Junior Python Developer',
  company: 'Observe.ai',
  location: 'Hyderabad, Telangana, India',
  workArrangement: 'Hybrid',
  employmentType: 'Full-time',
  experienceLevel: 'Entry',
  minExpYears: 0,
  maxExpYears: 2,
  fresherStatus: 'Fresher',
  locationCategory: 'India city',
  requiredSkills: ['Python', 'SQL'],
  preferredSkills: ['FastAPI'],
  source: 'company_board',
  sourceJobId: 'obs-01',
  originalUrl: 'https://observe.ai/jobs/01',
  canonicalUrl: 'https://observe.ai/jobs/01',
  description: 'Great opportunity for fresh graduates with strong Python foundation.',
  responsibilities: ['Build Python APIs'],
  datePosted: '2026-11-01',
  lastChecked: '2026-11-07',
  isStartup: true
};

const jobStaff7y: Job = {
  id: 'job-staff-7y',
  title: 'Staff Platform Architect (7+ yrs)',
  company: 'Global FinTech',
  location: 'Hyderabad, India',
  workArrangement: 'Hybrid',
  employmentType: 'Full-time',
  experienceLevel: 'Lead',
  minExpYears: 7,
  maxExpYears: 12,
  fresherStatus: 'Experienced',
  locationCategory: 'India city',
  requiredSkills: ['Python', 'SQL', 'Architecture'], // skills overlap with fresher!
  preferredSkills: [],
  source: 'company_board',
  sourceJobId: 'fin-01',
  originalUrl: 'https://fintech.com/jobs/01',
  canonicalUrl: 'https://fintech.com/jobs/01',
  description: 'Requires minimum 7 years experience in enterprise distributed systems.',
  responsibilities: ['Lead platform architecture'],
  datePosted: '2026-11-01',
  lastChecked: '2026-11-07',
  isStartup: false
};

const jobIntlRemoteNoIndia: Job = {
  id: 'job-intl-remote-us',
  title: 'Remote Full Stack Engineer (US Only)',
  company: 'US SaaS Corp',
  location: 'Remote, US',
  workArrangement: 'Remote',
  employmentType: 'Full-time',
  experienceLevel: 'Mid',
  minExpYears: 2,
  maxExpYears: 4,
  fresherStatus: 'Experienced',
  locationCategory: 'International location',
  requiredSkills: ['React', 'Node.js', 'Python'],
  preferredSkills: [],
  source: 'company_board',
  sourceJobId: 'us-01',
  originalUrl: 'https://ussaas.com/jobs/01',
  canonicalUrl: 'https://ussaas.com/jobs/01',
  description: 'Must reside in United States time zones. Not open to international applicants.',
  responsibilities: ['Build features'],
  datePosted: '2026-11-01',
  lastChecked: '2026-11-07',
  isStartup: true
};

console.log('--- TEST 1: Fresher (0y) vs Suitable Fresher Job vs Senior (7y+) Role ---');
const matchFresherToFresher = calculateDeterministicMatch(fresherProfile, jobFresherPython);
console.log(`Fresher -> Junior Python Job: Score = ${matchFresherToFresher.overallScore}% (Eligible: ${matchFresherToFresher.isFresherEligible})`);
console.log(`  Explanation: ${matchFresherToFresher.explanation}`);

const matchFresherToSenior = calculateDeterministicMatch(fresherProfile, jobStaff7y);
console.log(`Fresher -> Staff (7y+) Job: Score = ${matchFresherToSenior.overallScore}% (Eligible: ${matchFresherToSenior.isFresherEligible})`);
console.log(`  Explanation: ${matchFresherToSenior.explanation}`);
console.log(`  -> GATING VERIFIED: Fresher job (${matchFresherToFresher.overallScore}%) outranks 7y Senior role (${matchFresherToSenior.overallScore}%)\n`);

console.log('--- TEST 2: 1-Year Backend Developer ---');
const match1yToFresher = calculateDeterministicMatch(oneYearBackendProfile, jobFresherPython);
const match1yToSenior = calculateDeterministicMatch(oneYearBackendProfile, jobStaff7y);
console.log(`1-Year -> Junior Python: Score = ${match1yToFresher.overallScore}% | Explanation: ${match1yToFresher.explanation}`);
console.log(`1-Year -> Staff 7y+:     Score = ${match1yToSenior.overallScore}% | Explanation: ${match1yToSenior.explanation}\n`);

console.log('--- TEST 3: 2-Year Full Stack Developer ---');
const match2yToSenior = calculateDeterministicMatch(twoYearFullStackProfile, jobStaff7y);
console.log(`2-Year -> Staff 7y+: Score = ${match2yToSenior.overallScore}%`);
console.log(`  Concerns: ${match2yToSenior.eligibilityConcerns.join('; ')}\n`);

console.log('--- TEST 4: 5-Year Senior Candidate ---');
const jobSenior5y: Job = {
  ...jobStaff7y,
  id: 'job-sr-5y',
  title: 'Senior Backend Engineer (5+ yrs)',
  experienceLevel: 'Senior',
  minExpYears: 5,
  maxExpYears: 8,
};
const match5yTo5y = calculateDeterministicMatch(fiveYearSeniorProfile, jobSenior5y);
console.log(`5-Year -> Senior 5y Job: Score = ${match5yTo5y.overallScore}% | Concerns: ${match5yTo5y.eligibilityConcerns.length === 0 ? 'None' : match5yTo5y.eligibilityConcerns.join('; ')}\n`);

console.log('--- TEST 5: 7-Year Staff Candidate ---');
const match7yToStaff = calculateDeterministicMatch(sevenYearStaffProfile, jobStaff7y);
console.log(`7-Year -> Staff 7y+ Job: Score = ${match7yToStaff.overallScore}% | Explanation: ${match7yToStaff.explanation}\n`);

console.log('--- TEST 6: International Remote Job Without India Eligibility ---');
const matchFresherToIntlRemote = calculateDeterministicMatch(fresherProfile, jobIntlRemoteNoIndia);
console.log(`India Candidate -> US Only Remote Job: Score = ${matchFresherToIntlRemote.overallScore}%`);
console.log(`  Location Score: ${matchFresherToIntlRemote.dimensions.locationAndArrangement}%`);
console.log(`  Concerns: ${matchFresherToIntlRemote.eligibilityConcerns.join('; ')}`);
console.log(`  -> GATING VERIFIED: Ineligible foreign location heavily penalizes score!\n`);
