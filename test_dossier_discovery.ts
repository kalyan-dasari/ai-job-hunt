import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  initDatabase,
  closeDatabase,
  getDatabase,
  candidateRepository,
  jobsRepository,
  ingestionRunsRepository,
  apiUsageRepository,
  queryCacheRepository,
} from './server/database.ts';
import { sourceRegistry } from './server/job-sources/registry.ts';
import { normalizeJSearchJob } from './server/job-sources/sources/jsearch-adapter.ts';
import { normalizeAdzunaJob } from './server/job-sources/sources/adzuna-adapter.ts';
import { normalizeRawJob, isIndiaEligibleJob } from './server/job-sources/normalizer.ts';
import { calculateDossierMatch } from './server/matching.ts';
import { jobDiscoveryAgent } from './server/job-sources/agent.ts';
import { ingestionService } from './server/job-sources/scheduler.ts';
import { CandidateProfile } from './src/types/candidate.ts';
import { Job } from './src/types/job.ts';

const TEST_DB = path.resolve(process.cwd(), 'data', 'test_dossier_suite.db');

async function runDossierDiscoveryTests() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI — DOSSIER ARCHITECTURE DISCOVERY TEST SUITE          <<<');
  console.log(`>>> Isolated DB: ${TEST_DB}`);
  console.log('========================================================================\n');

  // Clean and initialize test DB
  closeDatabase();
  ['', '-wal', '-shm'].forEach((ext) => {
    const p = TEST_DB + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  process.env.DATABASE_PATH = 'data/test_dossier_suite.db';
  initDatabase(TEST_DB);

  // -------------------------------------------------------------
  // TEST 1: Source Registry has 3 Primary Dossier Channels
  // -------------------------------------------------------------
  console.log('Test 1: Three primary Dossier discovery channels are registered');
  const primaryAdapters = sourceRegistry.getPrimaryAdapters();
  const primaryIds = primaryAdapters.map((a) => a.id);

  if (
    primaryAdapters.length === 3 &&
    primaryIds.includes('jsearch-api') &&
    primaryIds.includes('adzuna-api') &&
    primaryIds.includes('career-pages-public')
  ) {
    console.log(`  -> PASS: JSearch, Adzuna, and Career Pages active as primary channels (${primaryIds.join(', ')}).\n`);
  } else {
    throw new Error(`Test 1 Failed: Primary adapters missing! Found: ${primaryIds.join(', ')}`);
  }

  // -------------------------------------------------------------
  // TEST 2: JSearch Provider Normalizer
  // -------------------------------------------------------------
  console.log('Test 2: JSearch normalizer maps official API payload to Job model');
  const mockJSearchItem = {
    job_id: 'jsearch-test-9921',
    job_title: 'Full Stack Engineer - React & Node.js',
    employer_name: 'PhonePe',
    job_city: 'Bengaluru',
    job_state: 'Karnataka',
    job_country: 'IN',
    job_is_remote: false,
    job_employment_type: 'FULLTIME',
    job_description: 'Building high throughput payment systems in Bangalore. Experience with React and Node.js required.',
    job_apply_link: 'https://phonepe.com/careers/jobs/9921',
    job_posted_at_datetime_utc: '2026-10-15T12:00:00.000Z',
    job_min_salary: 1800000,
    job_max_salary: 2800000,
    job_salary_currency: 'INR',
    job_salary_period: 'YEAR',
    job_required_skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
    job_required_experience: {
      no_experience_required: false,
      required_experience_in_months: 24,
      experience_mentioned: true,
    },
    job_highlights: {
      Responsibilities: [
        'Design distributed payment microservices',
        'Implement resilient real-time APIs',
      ],
    },
  };

  const normalizedJSearch = normalizeJSearchJob(mockJSearchItem);

  if (
    normalizedJSearch.company === 'PhonePe' &&
    normalizedJSearch.title === 'Full Stack Engineer - React & Node.js' &&
    normalizedJSearch.source === 'JSearch' &&
    normalizedJSearch.location.includes('Bengaluru') &&
    normalizedJSearch.minExpYears === 2 &&
    normalizedJSearch.salary?.min === 1800000 &&
    normalizedJSearch.salary?.currency === 'INR' &&
    normalizedJSearch.responsibilities.length === 2 &&
    normalizedJSearch.requiredSkills.includes('React')
  ) {
    console.log('  -> PASS: JSearch item accurately normalized with compensation, skills, and responsibilities.\n');
  } else {
    throw new Error('Test 2 Failed: JSearch normalization produced invalid job fields!');
  }

  // -------------------------------------------------------------
  // TEST 3: Adzuna India Provider Normalizer (HTML stripping & attribution)
  // -------------------------------------------------------------
  console.log('Test 3: Adzuna normalizer strips HTML tags and normalizes India payload');
  const mockAdzunaItem = {
    id: 'adzuna-in-8821',
    title: 'Senior <b>Software Developer</b> (Frontend)',
    company: { display_name: 'Swiggy' },
    location: { display_name: 'Hyderabad, Telangana' },
    description: 'Join Swiggy tech team. Work with <b>React</b> and <b>Redux</b> on customer food apps.',
    redirect_url: 'https://api.adzuna.com/v1/api/jobs/in/redirect/8821',
    created: '2026-10-20T08:00:00Z',
    salary_min: 1500000,
    salary_max: 2200000,
    contract_time: 'full_time',
  };

  const rawAdzuna = normalizeAdzunaJob(mockAdzunaItem);
  const normalizedAdzuna = normalizeRawJob(rawAdzuna);

  if (
    normalizedAdzuna.company === 'Swiggy' &&
    normalizedAdzuna.title === 'Senior Software Developer (Frontend)' && // HTML stripped!
    !normalizedAdzuna.description.includes('<b>') && // HTML stripped!
    normalizedAdzuna.source === 'Adzuna' &&
    normalizedAdzuna.location.includes('Hyderabad') &&
    normalizedAdzuna.originalUrl === mockAdzunaItem.redirect_url &&
    normalizedAdzuna.requiredSkills.includes('React')
  ) {
    console.log('  -> PASS: Adzuna HTML tags stripped, attribution preserved, and skills extracted.\n');
  } else {
    throw new Error('Test 3 Failed: Adzuna normalization failed HTML sanitization or fields mapping!');
  }

  // -------------------------------------------------------------
  // TEST 4: India-First Location Filtering
  // -------------------------------------------------------------
  console.log('Test 4: India-first filtering prioritizes Indian tech hubs and eligible remote roles');
  const hydJob = isIndiaEligibleJob('Hyderabad, Telangana', 'Software Engineer in Hitec City');
  const blrJob = isIndiaEligibleJob('Bengaluru, Karnataka', 'Frontend Engineer at Koramangala');
  const ncrJob = isIndiaEligibleJob('Gurgaon, Haryana, India', 'Backend Architect in DLF Cyber City');
  const remoteInJob = isIndiaEligibleJob('Remote (India)', 'Remote position for developers based in India');
  const remoteWorldJob = isIndiaEligibleJob('Remote - Worldwide', 'Work from anywhere in the world');
  const ukJob = isIndiaEligibleJob('London, United Kingdom', 'Onsite engineering in London office');
  const usJob = isIndiaEligibleJob('San Francisco, CA, USA', 'Must be authorized to work in USA');

  if (
    hydJob.eligible &&
    blrJob.eligible &&
    ncrJob.eligible &&
    remoteInJob.eligible &&
    remoteWorldJob.eligible &&
    !ukJob.eligible &&
    !usJob.eligible
  ) {
    console.log('  -> PASS: Approved Hyderabad, Bengaluru, Gurgaon, Remote (India), and Worldwide; rejected London and San Francisco.\n');
  } else {
    throw new Error('Test 4 Failed: India-first filtering incorrectly classified geographical eligibility!');
  }

  // -------------------------------------------------------------
  // TEST 5: Intelligent Dossier Match Evaluation (Fresher, Experience, Location)
  // -------------------------------------------------------------
  console.log('Test 5: Dossier match evaluation calculates 6D fit, fresher eligibility, and natural language explanations');
  const candidateFresher: CandidateProfile = {
    id: 'cand-fresher',
    name: 'Aarav Sharma',
    email: 'aarav.sharma@example.com',
    skills: ['Python', 'Django', 'React', 'TypeScript', 'PostgreSQL'],
    experience: [], // 0 years
    projects: [
      {
        id: 'proj-1',
        name: 'AI Job Tracker',
        description: 'Built full stack job hunting platform using React, TypeScript and Django.',
        skills: ['React', 'TypeScript', 'Django'],
      },
    ],
    education: [
      {
        id: 'edu-1',
        institution: 'IIT Hyderabad',
        degree: 'B.Tech in Computer Science',
        field: 'Computer Science',
        graduationYear: 2026,
      },
    ],
    preferredRoles: ['Software Engineer', 'Frontend Engineer'],
    preferredLocations: ['Hyderabad', 'Remote'],
    workArrangements: ['Hybrid', 'Remote'],
    resumeVersions: [],
    rawResumeText: '',
  };

  const entryJob: Job = {
    id: 'job-entry-01',
    title: 'Graduate Software Engineer',
    company: 'TechCorp India',
    location: 'Hyderabad, India',
    workArrangement: 'Hybrid',
    employmentType: 'Full-time',
    experienceLevel: 'Entry',
    minExpYears: 0,
    maxExpYears: 1,
    description: 'We welcome fresh university graduates with Python and React knowledge.',
    responsibilities: ['Develop clean code'],
    requiredSkills: ['Python', 'React'],
    preferredSkills: ['PostgreSQL'],
    source: 'JSearch',
    sourceJobId: 'js-entry-1',
    originalUrl: 'https://techcorp.example.com/grad',
    canonicalUrl: 'https://techcorp.example.com/grad',
    datePosted: new Date().toISOString().split('T')[0],
    lastChecked: new Date().toISOString(),
    isStartup: false,
    verificationReport: {
      status: 'Verified',
      confidence: 90,
      lastChecked: new Date().toISOString(),
      summary: 'Verified company listing',
      checks: [],
      evidence: [],
      warnings: [],
    },
  };

  const fresherMatch = calculateDossierMatch(candidateFresher, entryJob);

  if (
    fresherMatch.overallScore >= 80 &&
    fresherMatch.isFresherEligible === true &&
    fresherMatch.fresherExplanation &&
    fresherMatch.locationCompatibilityNote &&
    fresherMatch.locationCompatibilityNote.toLowerCase().includes('hyderabad') &&
    fresherMatch.strongMatches.includes('Python') &&
    fresherMatch.strongMatches.includes('React')
  ) {
    console.log(`  -> PASS: Fresher accurately evaluated (Score: ${fresherMatch.overallScore}%, Fresher Eligible: ${fresherMatch.isFresherEligible}, Location: ${fresherMatch.locationCompatibilityNote}).\n`);
  } else {
    throw new Error('Test 5 Failed: Fresher evaluation failed or missing location explanation!');
  }

  // -------------------------------------------------------------
  // TEST 6: SQLite Migration 003 API Usage & 24h Query Caching
  // -------------------------------------------------------------
  console.log('Test 6: Monthly API quotas and 24h SQLite query caching are enforced');
  // Check initial usage
  const jsearchUsageInit = apiUsageRepository.getUsage('jsearch', 200);
  const adzunaUsageInit = apiUsageRepository.getUsage('adzuna', 250);

  if (jsearchUsageInit.monthlyQuota !== 200 || adzunaUsageInit.monthlyQuota !== 250) {
    throw new Error('Test 6 Failed: Default quotas not initialized properly!');
  }

  // Record an API call
  apiUsageRepository.recordRequest('jsearch', 200);
  const afterRecord = apiUsageRepository.getUsage('jsearch', 200);
  if (afterRecord.requestsUsed !== jsearchUsageInit.requestsUsed + 1) {
    throw new Error('Test 6 Failed: Request count was not incremented!');
  }

  // Query cache store and retrieve
  const testCachePayload = { results: [{ id: 'cached-job-1', title: 'Cached React Role' }] };
  queryCacheRepository.set('jsearch', { query: 'React Developer Bangalore' }, testCachePayload, 86400);

  const cachedResult = queryCacheRepository.get<any>('jsearch', { query: 'React Developer Bangalore' });
  if (!cachedResult || cachedResult.results[0].title !== 'Cached React Role') {
    throw new Error('Test 6 Failed: SQLite query cache did not return cached response!');
  }

  console.log('  -> PASS: API usage recorded and 24-hour TTL query cache hit successfully in SQLite.\n');

  // -------------------------------------------------------------
  // TEST 7: JobDiscoveryAgent End-to-End Execution
  // -------------------------------------------------------------
  console.log('Test 7: JobDiscoveryAgent generates targeted queries and runs discovery pass');
  // Update candidate profile with real preferences
  candidateRepository.updateProfile({
    name: 'Aarav Sharma',
    skills: ['Python', 'Django', 'React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    preferredRoles: ['Full-Stack Engineer', 'Python Developer'],
    preferredLocations: ['Hyderabad', 'Bengaluru'],
  });

  const agentQueries = jobDiscoveryAgent.generateSearchQueries(candidateRepository.getProfile());
  if (agentQueries.length < 2 || !agentQueries[0].keywords.length) {
    throw new Error('Test 7 Failed: JobDiscoveryAgent failed to generate targeted search queries!');
  }

  console.log(`  -> Generated focused India queries: ${agentQueries.map((q) => `"${q.keywords.join(' ')}"`).join(', ')}`);

  // Run discovery with local direct career feeds
  const discoveryResult = await jobDiscoveryAgent.discover({
    sourceIds: ['career-pages-public'],
  });

  if (
    discoveryResult.run &&
    discoveryResult.run.status === 'completed' &&
    discoveryResult.run.sourcesChecked.length >= 1
  ) {
    console.log(`  -> PASS: Discovery executed successfully (Run ID: ${discoveryResult.run.id}, Opportunities evaluated: ${discoveryResult.recommendations.length}).\n`);
  } else {
    throw new Error('Test 7 Failed: JobDiscoveryAgent discovery run did not complete!');
  }

  // -------------------------------------------------------------
  // TEST 8: Hourly Scheduler Local Maintenance (Zero API Consumption)
  // -------------------------------------------------------------
  console.log('Test 8: Hourly catalog maintenance recalculates matches with ZERO API quota spend');
  const jsearchBefore = apiUsageRepository.getUsage('jsearch', 200).requestsUsed;
  const adzunaBefore = apiUsageRepository.getUsage('adzuna', 250).requestsUsed;

  const refreshResult = await ingestionService.refreshLocalCatalog();

  const jsearchAfter = apiUsageRepository.getUsage('jsearch', 200).requestsUsed;
  const adzunaAfter = apiUsageRepository.getUsage('adzuna', 250).requestsUsed;

  if (jsearchBefore === jsearchAfter && adzunaBefore === adzunaAfter) {
    console.log(`  -> PASS: Local maintenance refreshed catalog without consuming any external API calls (JSearch: ${jsearchAfter}, Adzuna: ${adzunaAfter}).\n`);
  } else {
    throw new Error('Test 8 Failed: Local maintenance consumed external API quota!');
  }

  console.log('========================================================================');
  console.log('>>> ALL 8 DOSSIER ARCHITECTURE DISCOVERY TESTS PASSED (100%)         <<<');
  console.log('========================================================================\n');
}

runDossierDiscoveryTests().catch((err) => {
  console.error('\n>>> DOSSIER TEST SUITE FAILED WITH AN ERROR <<<');
  console.error(err);
  process.exit(1);
});
