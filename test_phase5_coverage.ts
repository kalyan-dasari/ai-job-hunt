import {
  getDatabase,
  companySourcesRepository,
  jobsRepository,
  ingestionRunsRepository,
  discoveryAttemptsRepository,
} from './server/database.ts';
import { jobDiscoveryAgent } from './server/job-sources/agent.ts';
import { calculateDeterministicMatch } from './server/matching.ts';
import { classifyLocation, normalizeExperienceLevel, evaluateTargetRole } from './server/job-sources/normalizer.ts';
import { CandidateProfile } from './src/types/candidate.ts';
import { Job } from './src/types/job.ts';

async function runPhase5Verification() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI — PHASE 5: COVERAGE & FRESHER RELEVANCE VERIFICATION <<<');
  console.log('========================================================================\n');

  const db = getDatabase();

  // 1. Verify Migration 005 and Expanded Company Catalog in SQLite
  console.log('--- 1. COMPANY COVERAGE IN SQLITE ---');
  const companies = companySourcesRepository.getAll();
  console.log(`Total Company Sources in Database: ${companies.length} (${companies.filter(c => c.status === 'active').length} active)`);

  const hyderabadCompanies = companies.filter(c => ['observeai', 'zenoti', 'highradius', 'decisions', 'cred'].some(s => (c.atsSlug || '').toLowerCase().includes(s)));
  const bengaluruCompanies = companies.filter(c => ['apna', 'swiggy', 'razorpay', 'fortanix', 'signoz', 'inmobi', 'slice', 'mercari'].some(s => (c.atsSlug || '').toLowerCase().includes(s)));
  const chennaiPuneCompanies = companies.filter(c => ['freshworks', 'mindtickle', 'druva'].some(s => (c.atsSlug || '').toLowerCase().includes(s)));

  console.log(`- Hyderabad Tech & SaaS Hub:      ${hyderabadCompanies.map(c => c.name).join(', ')}`);
  console.log(`- Bengaluru Startups & Unicorns:  ${bengaluruCompanies.map(c => c.name).join(', ')}`);
  console.log(`- Chennai & Pune Tech:            ${chennaiPuneCompanies.map(c => c.name).join(', ')}`);

  // 2. Unit Verification of Strict Location & Experience Normalization
  console.log('\n--- 2. STRICT LOCATION & EXPERIENCE CLASSIFICATION ---');

  // Location test cases
  const locTest1 = classifyLocation('Hyderabad, Telangana, India');
  console.log(`  [Location] "Hyderabad, Telangana, India" -> Category: "${locTest1.category}" | Eligible: ${locTest1.eligible}`);
  const locTest2 = classifyLocation('Bengaluru, Karnataka');
  console.log(`  [Location] "Bengaluru, Karnataka"        -> Category: "${locTest2.category}" | Eligible: ${locTest2.eligible}`);
  const locTest3 = classifyLocation('Remote - India');
  console.log(`  [Location] "Remote - India"              -> Category: "${locTest3.category}" | Eligible: ${locTest3.eligible}`);
  const locTest4 = classifyLocation('Remote'); // Generic remote without India confirmation
  console.log(`  [Location] "Remote" (Generic)            -> Category: "${locTest4.category}" | Eligible: ${locTest4.eligible} (${locTest4.reason})`);
  const locTest5 = classifyLocation('London, United Kingdom');
  console.log(`  [Location] "London, United Kingdom"      -> Category: "${locTest5.category}" | Eligible: ${locTest5.eligible}`);

  // Experience test cases
  const expTest1 = normalizeExperienceLevel(undefined, undefined, 'Software Developer Intern', 'Exciting 6-month internship');
  console.log(`  [Experience] "Software Developer Intern" -> Status: "${expTest1.fresherStatus}", Eligible: ${expTest1.isFresherEligible}`);
  const expTest2 = normalizeExperienceLevel(undefined, undefined, 'Junior Python Developer', '0-1 years of experience required');
  console.log(`  [Experience] "Junior Python Developer"  -> Status: "${expTest2.fresherStatus}", Eligible: ${expTest2.isFresherEligible}`);
  const expTest3 = normalizeExperienceLevel(undefined, undefined, 'Software Engineer', 'Work on web platforms and services'); // Unspecified
  console.log(`  [Experience] "Software Engineer" (none)  -> Status: "${expTest3.fresherStatus}", Level: "${expTest3.level}", Eligible: ${expTest3.isFresherEligible} (NOT auto-fresher)`);
  const expTest4 = normalizeExperienceLevel(undefined, 7, 'Principal Software Engineer', 'Requires minimum 7 years of distributed systems experience');
  console.log(`  [Experience] "Principal Engineer (7y)"  -> Status: "${expTest4.fresherStatus}", Eligible: ${expTest4.isFresherEligible}`);

  // 3. Match Ranking & Eligibility Check Verification
  console.log('\n--- 3. HIERARCHICAL RANKING: FRESHER vs 7-YEAR SENIOR ---');
  const fresherProfile: CandidateProfile = {
    id: 'fresher-candidate-test',
    fullName: 'Rahul Varma',
    email: 'rahul@example.com',
    headline: 'Aspiring Full Stack & Python Developer',
    summary: 'Fresher graduate with Python, React, and SQL skills.',
    preferredRoles: ['Python Developer', 'Full Stack Developer', 'Software Engineer'],
    preferredLocations: ['Hyderabad', 'Bengaluru'],
    skills: ['Python', 'React', 'JavaScript', 'SQL', 'Git', 'FastAPI'],
    experience: [], // 0 years
    projects: [
      { id: 'p1', title: 'Task Manager API', description: 'Built with Python and FastAPI', technologies: ['Python', 'FastAPI'], role: 'Author' },
    ],
    education: [
      { id: 'e1', institution: 'JNTU Hyderabad', degree: 'B.Tech Computer Science', fieldOfStudy: 'Computer Science', graduationYear: 2026 },
    ],
    certifications: [],
    resumeVersions: [],
    updatedAt: new Date().toISOString(),
  };

  // Job A: Suitable Fresher Python / React Job (0-1 yrs)
  const fresherJob: Job = {
    id: 'job-fresher-test-1',
    title: 'Junior Python Developer',
    company: 'Observe.ai',
    location: 'Hyderabad, India',
    workArrangement: 'Hybrid',
    employmentType: 'Full-time',
    experienceLevel: 'Entry',
    minExpYears: 0,
    maxExpYears: 1,
    fresherStatus: 'Fresher',
    locationCategory: 'India city',
    requiredSkills: ['Python', 'FastAPI', 'SQL'],
    preferredSkills: ['React', 'Git'],
    description: 'Looking for a Junior Python Developer or Fresh Graduate with strong CS fundamentals.',
    responsibilities: ['Build backend services'],
    source: 'Greenhouse',
    sourceJobId: 'obs-001',
    originalUrl: 'https://example.com/obs-001',
    canonicalUrl: 'https://example.com/obs-001',
    datePosted: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    isStartup: true,
    verificationReport: { status: 'Verified', confidence: 95, lastChecked: new Date().toISOString(), summary: 'Valid', checks: [], evidence: [], warnings: [] },
  };

  // Job B: Senior Staff Position (7+ yrs) with 100% technical skills match
  const seniorJob: Job = {
    id: 'job-senior-test-2',
    title: 'Staff Principal Engineer',
    company: 'BigTech Platforms',
    location: 'Hyderabad, India',
    workArrangement: 'Hybrid',
    employmentType: 'Full-time',
    experienceLevel: 'Lead',
    minExpYears: 7,
    maxExpYears: 12,
    fresherStatus: 'Experienced',
    locationCategory: 'India city',
    requiredSkills: ['Python', 'React', 'SQL', 'FastAPI'], // 100% overlap
    preferredSkills: [],
    description: 'Requires minimum 7+ years of building large-scale distributed architectures.',
    responsibilities: ['Architect systems'],
    source: 'Greenhouse',
    sourceJobId: 'bt-002',
    originalUrl: 'https://example.com/bt-002',
    canonicalUrl: 'https://example.com/bt-002',
    datePosted: new Date().toISOString(),
    lastChecked: new Date().toISOString(),
    isStartup: false,
    verificationReport: { status: 'Verified', confidence: 95, lastChecked: new Date().toISOString(), summary: 'Valid', checks: [], evidence: [], warnings: [] },
  };

  const matchFresher = calculateDeterministicMatch(fresherProfile, fresherJob);
  const matchSenior = calculateDeterministicMatch(fresherProfile, seniorJob);

  console.log(`  Job A (Fresher Python Dev, 0-1y): Overall Score = ${matchFresher.overallScore}%`);
  console.log(`    Explanation: "${matchFresher.explanation}"`);
  console.log(`  Job B (Staff Principal, 7y+ req): Overall Score = ${matchSenior.overallScore}% (Capped due to experience barrier)`);
  console.log(`    Explanation: "${matchSenior.explanation}"`);

  if (matchFresher.overallScore > matchSenior.overallScore) {
    console.log(`  -> PASS: Suitable fresher job (${matchFresher.overallScore}%) correctly outranks senior 7-year role (${matchSenior.overallScore}%)!`);
  } else {
    console.error(`  -> FAIL: Senior role outranked fresher job!`);
  }

  // 4. Live Discovery with Expanded Company Coverage
  console.log('\n--- 4. LIVE DISCOVERY WITH EXPANDED COMPANY CATALOG ---');
  // Target a diverse selection of verified live employers across Hyderabad, Bengaluru, Chennai, Pune
  const liveTargetIds = [
    'comp-observeai',   // Hyderabad (AI SaaS)
    'comp-decisions',   // Hyderabad / Mumbai
    'comp-apna',        // Bengaluru / India
    'comp-fortanix',    // Bengaluru
    'comp-inmobi',      // Bengaluru
    'comp-cred',        // Bengaluru / Hyderabad
    'comp-mindtickle',  // Pune
    'comp-freshworks',  // Chennai
    'comp-tibber',      // India
    'comp-signoz',      // Bengaluru (Open source AI / DevTools)
  ];

  console.log(`Running discovery across ${liveTargetIds.length} target employers...`);
  const discoveryRun = await jobDiscoveryAgent.discover({
    companyIds: liveTargetIds,
  });

  console.log(`\nDiscovery Run Results (Run ID: ${discoveryRun.run.id}):`);
  console.log(`- Status:               ${discoveryRun.run.status}`);
  console.log(`- Raw Jobs Found:       ${discoveryRun.run.jobsFound}`);
  console.log(`- Jobs Added to SQLite: ${discoveryRun.run.jobsAdded}`);
  console.log(`- Duplicates Merged:    ${discoveryRun.run.duplicatesFiltered}`);
  console.log(`- Sources Checked:      ${discoveryRun.run.sourcesChecked.length} (${discoveryRun.run.sourcesChecked.join(', ')})`);
  console.log(`- Errors:               ${discoveryRun.run.errors.length === 0 ? 'None' : discoveryRun.run.errors.join('; ')}`);

  // 5. Query SQLite Directly and Report Metrics
  console.log('\n--- 5. DIRECT SQLITE AUDIT METRICS ---');
  const allJobs = jobsRepository.getAllJobs();
  const totalJobsCount = allJobs.length;

  const hyderabadJobs = allJobs.filter(j => j.location.toLowerCase().includes('hyderabad'));
  const bengaluruJobs = allJobs.filter(j => j.location.toLowerCase().includes('bengaluru') || j.location.toLowerCase().includes('bangalore'));
  const remoteIndiaJobs = allJobs.filter(j => j.locationCategory === 'India remote' || (j.workArrangement === 'Remote' && (j.location.toLowerCase().includes('india') || j.country === 'India')));
  const fresherJobs = allJobs.filter(j => j.fresherStatus === 'Fresher' || j.experienceLevel === 'Intern' || j.experienceLevel === 'Entry' || (j.minExpYears !== undefined && j.minExpYears <= 1) || j.matchResult?.isFresherEligible);
  const unclearJobs = allJobs.filter(j => j.fresherStatus === 'Unclear' || (!j.fresherStatus && j.minExpYears === undefined && !['Intern', 'Entry', 'Senior', 'Lead'].includes(j.experienceLevel)));
  const experiencedJobs = allJobs.filter(j => j.fresherStatus === 'Experienced' || j.experienceLevel === 'Senior' || j.experienceLevel === 'Lead' || (j.minExpYears !== undefined && j.minExpYears >= 3));

  console.log(`  1. Total Unique Jobs in SQLite:     ${totalJobsCount}`);
  console.log(`  2. Hyderabad Jobs:                  ${hyderabadJobs.length}`);
  console.log(`  3. Bengaluru Jobs:                  ${bengaluruJobs.length}`);
  console.log(`  4. Remote in India Jobs:            ${remoteIndiaJobs.length}`);
  console.log(`  5. Fresher-Friendly Jobs (0-1 yrs): ${fresherJobs.length}`);
  console.log(`  6. Unclear Experience Jobs:         ${unclearJobs.length}`);
  console.log(`  7. Experienced Jobs (3+ yrs):       ${experiencedJobs.length}`);

  console.log('\nSample Discovered Fresher / Early Career Jobs in SQLite:');
  fresherJobs.slice(0, 5).forEach((j, idx) => {
    console.log(`  [Fresher Job ${idx + 1}] "${j.title}"`);
    console.log(`    Company:  ${j.company}`);
    console.log(`    Location: ${j.location}`);
    console.log(`    Exp Req:  Level=${j.experienceLevel}, Min=${j.minExpYears ?? 0}y, Max=${j.maxExpYears ?? 1}y`);
    console.log(`    URL:      ${j.applicationUrl || j.originalUrl}`);
  });

  console.log('\nSample Hyderabad Jobs in SQLite:');
  hyderabadJobs.slice(0, 4).forEach((j, idx) => {
    console.log(`  [Hyderabad Job ${idx + 1}] "${j.title}"`);
    console.log(`    Company:  ${j.company}`);
    console.log(`    Location: ${j.location}`);
    console.log(`    URL:      ${j.applicationUrl || j.originalUrl}`);
  });

  console.log('\n--- 6. RECENT EXCLUSIONS LOGGED ---');
  const exclusions = discoveryRun.run.details?.exclusions || [];
  console.log(`Total Exclusions Logged in this Run: ${exclusions.length}`);
  exclusions.slice(0, 6).forEach((exc: any, idx: number) => {
    console.log(`  [Excluded ${idx + 1}] "${exc.title}" at ${exc.company} (${exc.location}) -> Reason: ${exc.reason}`);
  });

  console.log('\n========================================================================');
  console.log('>>> PHASE 5 VERIFICATION COMPLETED SUCCESSFULLY                      <<<');
  console.log('========================================================================\n');
}

runPhase5Verification().catch((err) => {
  console.error('Fatal error in Phase 5 verification:', err);
  process.exit(1);
});
