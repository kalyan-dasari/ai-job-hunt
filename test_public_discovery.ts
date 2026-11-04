import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import {
  initDatabase,
  closeDatabase,
  getDatabase,
  candidateRepository,
  jobsRepository,
  jobSourcesRepository,
  ingestionRunsRepository,
  companySourcesRepository,
  discoveryAttemptsRepository,
} from './server/database.ts';
import { getAllAtsAdapters, getAtsAdapter } from './server/job-sources/ats/index.ts';
import { atsDetector } from './server/job-sources/discovery/ats-detector.ts';
import { jsonLdExtractor } from './server/job-sources/discovery/jsonld-extractor.ts';
import { feedParser } from './server/job-sources/discovery/feed-parser.ts';
import { sitemapParser } from './server/job-sources/discovery/sitemap-parser.ts';
import { normalizeRawJob, isIndiaEligibleJob } from './server/job-sources/normalizer.ts';
import { deduplicator } from './server/job-sources/deduplicator.ts';
import { calculateDossierMatch } from './server/matching.ts';
import { jobDiscoveryAgent } from './server/job-sources/agent.ts';
import { CandidateProfile, emptyCandidateProfile } from './src/types/candidate.ts';
import { RawSourceJob } from './server/job-sources/types.ts';

const TEST_DB = path.resolve(process.cwd(), 'data', 'test_public_discovery.db');

async function runPublicDiscoveryTests() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI — WEB-FIRST PUBLIC JOB DISCOVERY TEST SUITE          <<<');
  console.log(`>>> Isolated DB: ${TEST_DB}`);
  console.log('========================================================================\n');

  // Clean and initialize test DB
  closeDatabase();
  ['', '-wal', '-shm'].forEach((ext) => {
    const p = TEST_DB + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  process.env.DATABASE_PATH = 'data/test_public_discovery.db';
  initDatabase(TEST_DB);

  // -------------------------------------------------------------
  // TEST 1: Migration 004 & 16 Seeded Indian Tech Companies
  // -------------------------------------------------------------
  console.log('Test 1: Migration 004 and Initial Seeded Indian Companies');
  const companies = companySourcesRepository.getAll();
  console.log(`  -> Found ${companies.length} companies in company_sources table.`);

  if (companies.length < 16) {
    throw new Error(`Test 1 Failed: Expected at least 16 seeded companies, found ${companies.length}`);
  }

  const razorpay = companySourcesRepository.getById('comp-razorpay');
  const postman = companySourcesRepository.getById('comp-postman');
  const cred = companySourcesRepository.getById('comp-cred');
  const hackerearth = companySourcesRepository.getById('comp-hackerearth');

  if (!razorpay || razorpay.atsProvider !== 'greenhouse' || razorpay.atsSlug !== 'razorpay') {
    throw new Error('Test 1 Failed: Razorpay Greenhouse record missing or misconfigured');
  }
  if (!cred || cred.atsProvider !== 'lever' || cred.atsSlug !== 'cred') {
    throw new Error('Test 1 Failed: CRED Lever record missing or misconfigured');
  }
  if (!hackerearth || hackerearth.atsProvider !== 'recruitee' || hackerearth.atsSlug !== 'hackerearth') {
    throw new Error('Test 1 Failed: HackerEarth Recruitee record missing or misconfigured');
  }

  console.log('  -> PASS: Initial Indian seed catalog loaded successfully with active ATS associations.\n');

  // -------------------------------------------------------------
  // TEST 2: Company Sources Repository CRUD & Crawl Tracking
  // -------------------------------------------------------------
  console.log('Test 2: Company Sources Repository Operations');
  const testComp = companySourcesRepository.create({
    id: 'comp-test-swiggy',
    name: 'Swiggy',
    websiteUrl: 'https://swiggy.com',
    careersUrl: 'https://careers.swiggy.com',
    atsProvider: 'greenhouse',
    atsSlug: 'swiggy',
    status: 'active',
    crawlFrequencyHours: 6,
  });

  if (testComp.name !== 'Swiggy' || testComp.status !== 'active') {
    throw new Error('Test 2 Failed: Could not create company source');
  }

  companySourcesRepository.recordCrawlResult('comp-test-swiggy', 12);
  const updatedComp = companySourcesRepository.getById('comp-test-swiggy');
  if (!updatedComp || updatedComp.jobsCount !== 12 || !updatedComp.lastCrawlAt) {
    throw new Error('Test 2 Failed: recordCrawlResult did not update jobsCount or timestamp');
  }

  discoveryAttemptsRepository.record({
    companyId: 'comp-test-swiggy',
    url: 'https://boards-api.greenhouse.io/v1/boards/swiggy/jobs',
    status: 'success',
    httpStatus: 200,
    jobsFound: 12,
  });

  const attempts = discoveryAttemptsRepository.getRecent(10);
  if (attempts.length === 0 || attempts[0].jobsFound !== 12) {
    throw new Error('Test 2 Failed: Discovery attempts not recorded');
  }

  companySourcesRepository.delete('comp-test-swiggy');
  if (companySourcesRepository.getById('comp-test-swiggy') !== null) {
    throw new Error('Test 2 Failed: Company delete failed');
  }

  console.log('  -> PASS: Company sources CRUD, crawl results, and audit attempts verified.\n');

  // -------------------------------------------------------------
  // TEST 3: All 11 Public ATS Adapters Registered & URL Building
  // -------------------------------------------------------------
  console.log('Test 3: Public ATS Adapter Registry (11 Providers)');
  const expectedProviders = [
    'greenhouse', 'lever', 'ashby', 'workable', 'smartrecruiters',
    'recruitee', 'personio', 'breezy', 'teamtailor', 'rippling', 'workday'
  ];

  const allAdapters = getAllAtsAdapters();
  console.log(`  -> Registered ATS adapters: ${allAdapters.map((a) => a.provider).join(', ')}`);

  for (const prov of expectedProviders) {
    const adapter = getAtsAdapter(prov);
    if (!adapter) {
      throw new Error(`Test 3 Failed: Adapter for ${prov} not found in registry!`);
    }
    const sampleUrl = adapter.buildPublicUrl('testslug');
    if (!sampleUrl.includes('testslug') && !sampleUrl.startsWith('http')) {
      throw new Error(`Test 3 Failed: Invalid public URL for ${prov}: ${sampleUrl}`);
    }
  }

  console.log('  -> PASS: All 11 public ATS adapters registered with valid URL builders.\n');

  // -------------------------------------------------------------
  // TEST 4: ATS URL and HTML Content Detector
  // -------------------------------------------------------------
  console.log('Test 4: Career Page ATS Auto-Detector');
  // Test URL detection
  const detectedGh = atsDetector.detect('https://boards.greenhouse.io/razorpay');
  if (!detectedGh || detectedGh.provider !== 'greenhouse' || detectedGh.slug !== 'razorpay') {
    throw new Error(`Test 4 Failed: Greenhouse URL detection failed: ${JSON.stringify(detectedGh)}`);
  }

  const detectedLever = atsDetector.detect('https://jobs.lever.co/cred');
  if (!detectedLever || detectedLever.provider !== 'lever' || detectedLever.slug !== 'cred') {
    throw new Error(`Test 4 Failed: Lever URL detection failed: ${JSON.stringify(detectedLever)}`);
  }

  const detectedAshby = atsDetector.detect('https://jobs.ashbyhq.com/postman');
  if (!detectedAshby || detectedAshby.provider !== 'ashby' || detectedAshby.slug !== 'postman') {
    throw new Error(`Test 4 Failed: Ashby URL detection failed: ${JSON.stringify(detectedAshby)}`);
  }

  const detectedWorkable = atsDetector.detect('https://apply.workable.com/browserstack/');
  if (!detectedWorkable || detectedWorkable.provider !== 'workable' || detectedWorkable.slug !== 'browserstack') {
    throw new Error(`Test 4 Failed: Workable URL detection failed: ${JSON.stringify(detectedWorkable)}`);
  }

  const detectedSmart = atsDetector.detect('https://jobs.smartrecruiters.com/CleverTap');
  if (!detectedSmart || detectedSmart.provider !== 'smartrecruiters' || detectedSmart.slug.toLowerCase() !== 'clevertap') {
    throw new Error(`Test 4 Failed: SmartRecruiters URL detection failed: ${JSON.stringify(detectedSmart)}`);
  }

  const detectedRecruitee = atsDetector.detect('https://hackerearth.recruitee.com/');
  if (!detectedRecruitee || detectedRecruitee.provider !== 'recruitee' || detectedRecruitee.slug !== 'hackerearth') {
    throw new Error(`Test 4 Failed: Recruitee URL detection failed: ${JSON.stringify(detectedRecruitee)}`);
  }

  // Test HTML iframe / script embed detection
  const mockHtmlWithEmbed = `
    <html>
      <head><title>Careers at NeoTech</title></head>
      <body>
        <h1>Work with us</h1>
        <iframe src="https://boards.greenhouse.io/embed/job_board?for=neotechindia"></iframe>
      </body>
    </html>
  `;
  const detectedEmbed = atsDetector.detect('https://neotech.io/careers', mockHtmlWithEmbed);
  if (!detectedEmbed || detectedEmbed.provider !== 'greenhouse' || detectedEmbed.slug !== 'neotechindia') {
    throw new Error(`Test 4 Failed: Embedded iframe detection failed: ${JSON.stringify(detectedEmbed)}`);
  }

  console.log('  -> PASS: ATS detector successfully identified ATS providers across URLs and HTML embeds.\n');

  // -------------------------------------------------------------
  // TEST 5: Schema.org JobPosting JSON-LD Extractor
  // -------------------------------------------------------------
  console.log('Test 5: Schema.org JobPosting JSON-LD Extraction');
  const sampleJsonLdHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org/",
          "@type": "JobPosting",
          "title": "Full Stack Engineer (React / Node.js)",
          "description": "<p>Build real-time financial infrastructure across India. Experience with TypeScript and PostgreSQL required.</p>",
          "datePosted": "2026-11-01",
          "employmentType": "FULL_TIME",
          "hiringOrganization": {
            "@type": "Organization",
            "name": "FinTech Prime India",
            "sameAs": "https://fintechprime.in"
          },
          "jobLocation": {
            "@type": "Place",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Bengaluru",
              "addressRegion": "Karnataka",
              "addressCountry": "IN"
            }
          },
          "baseSalary": {
            "@type": "MonetaryAmount",
            "currency": "INR",
            "value": {
              "@type": "QuantitativeValue",
              "minValue": 1800000,
              "maxValue": 2800000,
              "unitText": "YEAR"
            }
          },
          "url": "https://fintechprime.in/careers/full-stack-engineer-101"
        }
        </script>
      </head>
      <body><h1>Careers</h1></body>
    </html>
  `;

  const extractedJobs = jsonLdExtractor.extract(sampleJsonLdHtml, 'https://fintechprime.in/careers', 'FinTech Prime India');
  if (extractedJobs.length !== 1) {
    throw new Error(`Test 5 Failed: Expected 1 JSON-LD job, extracted ${extractedJobs.length}`);
  }

  const jobLd = extractedJobs[0];
  if (
    jobLd.title !== 'Full Stack Engineer (React / Node.js)' ||
    jobLd.company !== 'FinTech Prime India' ||
    !jobLd.location.toLowerCase().includes('bengaluru') ||
    jobLd.salaryMin !== 1800000 ||
    jobLd.salaryMax !== 2800000 ||
    jobLd.salaryCurrency !== 'INR' ||
    jobLd.sourceName !== 'JSON-LD'
  ) {
    throw new Error(`Test 5 Failed: JobPosting parsing attributes incorrect: ${JSON.stringify(jobLd)}`);
  }

  console.log('  -> PASS: JSON-LD JobPosting schema parsed accurately (Title, Compensation, Location, Org).\n');

  // -------------------------------------------------------------
  // TEST 6: RSS 2.0 and Atom Feed Parser
  // -------------------------------------------------------------
  console.log('Test 6: RSS 2.0 / Atom Job Feed Parser');
  const sampleRssXml = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Careers at CloudTech India</title>
        <link>https://cloudtech.in/careers</link>
        <item>
          <title>Senior Backend Developer (Go / Distributed Systems)</title>
          <link>https://cloudtech.in/jobs/senior-backend-dev-42</link>
          <description>We are looking for a Senior Go Engineer to scale our distributed cloud storage platform.</description>
          <pubDate>Mon, 02 Nov 2026 10:00:00 GMT</pubDate>
          <guid>cloudtech-job-42</guid>
        </item>
      </channel>
    </rss>
  `;

  const rssJobs = feedParser.parse(sampleRssXml, 'CloudTech India', 'https://cloudtech.in/jobs.rss');
  if (rssJobs.length !== 1) {
    throw new Error(`Test 6 Failed: Expected 1 RSS job, found ${rssJobs.length}`);
  }

  const rssJob = rssJobs[0];
  if (
    rssJob.title !== 'Senior Backend Developer (Go / Distributed Systems)' ||
    rssJob.company !== 'CloudTech India' ||
    rssJob.url !== 'https://cloudtech.in/jobs/senior-backend-dev-42' ||
    rssJob.sourceName !== 'RSS Feed'
  ) {
    throw new Error(`Test 6 Failed: RSS Job item fields incorrect: ${JSON.stringify(rssJob)}`);
  }

  console.log('  -> PASS: RSS 2.0 feed parsed and normalized into standard job format.\n');

  // -------------------------------------------------------------
  // TEST 7: India-First Filtering Logic
  // -------------------------------------------------------------
  console.log('Test 7: India-First Geographic Relevancy Filtering');
  const testLocations = [
    { loc: 'Bengaluru, Karnataka, India', desc: 'Work in our Indiranagar office', expected: true },
    { loc: 'Hyderabad, Telangana', desc: 'HITEC City campus', expected: true },
    { loc: 'Pune, Maharashtra', desc: 'Hybrid in Baner office', expected: true },
    { loc: 'Remote (India)', desc: 'Work from anywhere in India', expected: true },
    { loc: 'Remote', desc: 'Worldwide remote opportunity. Flexible hours.', expected: true },
    { loc: 'Remote - US Only', desc: 'Must be authorized to work in the United States.', expected: false },
    { loc: 'London, United Kingdom', desc: 'Located in central London near King Cross.', expected: false },
    { loc: 'San Francisco, CA', desc: 'Onsite in SF office.', expected: false },
  ];

  for (const item of testLocations) {
    const res = isIndiaEligibleJob(item.loc, item.desc);
    if (res.eligible !== item.expected) {
      throw new Error(`Test 7 Failed: Location "${item.loc}" expected eligible=${item.expected}, got ${res.eligible}`);
    }
  }

  console.log('  -> PASS: Indian tech hubs and eligible remote roles passed; foreign non-India roles rejected.\n');

  // -------------------------------------------------------------
  // TEST 8: Fresher Eligibility Classification & Dossier Fit
  // -------------------------------------------------------------
  console.log('Test 8: Fresher Eligibility Classification');
  const candidateFresher: CandidateProfile = {
    ...emptyCandidateProfile,
    id: 'candidate-fresher-test',
    fullName: 'Arjun Verma',
    headline: 'Junior Software Engineer',
    preferredRoles: ['Software Engineer', 'Frontend Developer'],
    preferredLocations: ['Bengaluru', 'Hyderabad'],
    skills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
    experience: [], // 0 years
  };

  const rawFresherJob: RawSourceJob = {
    externalId: 'fresher-gh-101',
    title: 'Associate Software Engineer - Trainee',
    company: 'Razorpay',
    location: 'Bengaluru, India',
    workArrangement: 'Hybrid',
    employmentType: 'Full-time',
    experienceLevel: 'Entry',
    minExpYears: 0,
    maxExpYears: 1,
    description: 'Great opportunity for fresh engineering graduates (2025/2026 batch) with knowledge of JavaScript and React.',
    skills: ['JavaScript', 'React', 'TypeScript'],
    url: 'https://razorpay.com/jobs/ase-trainee-101',
    sourceName: 'Greenhouse',
  };

  const normalizedFresher = normalizeRawJob(rawFresherJob);
  const matchResult = calculateDossierMatch(candidateFresher, normalizedFresher);

  if (!matchResult.isFresherEligible) {
    throw new Error('Test 8 Failed: Job should be classified as fresher eligible');
  }
  if ((matchResult.overallScore || 0) < 60) {
    throw new Error(`Test 8 Failed: Expected high match score for fresher candidate, got ${matchResult.overallScore}`);
  }

  console.log(`  -> PASS: Fresher role correctly classified (Score: ${matchResult.overallScore}%, Explanation: "${matchResult.fresherExplanation}").\n`);

  // -------------------------------------------------------------
  // TEST 9: Cross-Source Deduplication & Multi-Source Tracking
  // -------------------------------------------------------------
  console.log('Test 9: Cross-Source Deduplication & Provenance Linking');
  // First ingestion: from Greenhouse
  const savedJob1 = jobsRepository.saveJob(normalizedFresher);
  jobSourcesRepository.addSourceReference({
    id: 'jsrc-test-1',
    jobId: savedJob1.id,
    sourceName: 'Greenhouse',
    sourceJobId: 'fresher-gh-101',
    sourceUrl: savedJob1.originalUrl,
    discoveredAt: new Date().toISOString(),
  });

  // Duplicate listing from another channel (e.g. JSON-LD on company careers)
  const duplicateJobRaw: RawSourceJob = {
    title: 'associate software engineer trainee',
    company: 'Razorpay Software',
    location: 'Bengaluru',
    description: 'Great opportunity for fresh engineering graduates with knowledge of JavaScript and React.',
    url: 'https://razorpay.com/careers/ase-trainee-101?ref=careers_page',
    sourceName: 'JSON-LD',
  };

  const normalizedDup = normalizeRawJob(duplicateJobRaw);
  const dedupEval = deduplicator.evaluate(normalizedDup, [savedJob1]);

  if (!dedupEval.isDuplicate || !dedupEval.matchedExistingJob) {
    throw new Error('Test 9 Failed: Deduplicator failed to identify duplicate posting');
  }

  // Link multi-source provenance
  jobSourcesRepository.addSourceReference({
    id: 'jsrc-test-2',
    jobId: dedupEval.matchedExistingJob.id,
    sourceName: 'JSON-LD',
    sourceUrl: normalizedDup.originalUrl,
    discoveredAt: new Date().toISOString(),
  });

  const sourcesForJob = jobSourcesRepository.getSourcesForJob(savedJob1.id);
  if (sourcesForJob.length !== 2) {
    throw new Error(`Test 9 Failed: Expected 2 cross-posted sources, found ${sourcesForJob.length}`);
  }

  console.log(`  -> PASS: Cross-source deduplication identified duplicate and preserved provenance (${sourcesForJob.map((s) => s.sourceName).join(', ')}).\n`);

  // -------------------------------------------------------------
  // TEST 10: End-to-End Central JobDiscoveryAgent Workflow
  // -------------------------------------------------------------
  console.log('Test 10: End-to-End JobDiscoveryAgent Ingestion Cycle');
  const agentRunResult = await jobDiscoveryAgent.discover({
    limitCompanies: 3,
    triggerType: 'manual',
  });

  if (!agentRunResult.run || agentRunResult.run.status !== 'completed') {
    throw new Error(`Test 10 Failed: Discovery run status is ${agentRunResult.run?.status}`);
  }

  const allDbJobs = jobsRepository.getAllJobs();
  console.log(`  -> Total jobs in SQLite after discovery run: ${allDbJobs.length}`);
  console.log(`  -> Sources crawled in run: ${agentRunResult.run.sourcesChecked.join(', ')}`);
  console.log(`  -> Duplicate jobs filtered: ${agentRunResult.run.duplicatesFiltered}`);

  console.log('  -> PASS: Central JobDiscoveryAgent completed full discovery and persistence pipeline.\n');

  console.log('========================================================================');
  console.log('>>> ALL 10 WEB-FIRST PUBLIC DISCOVERY ENGINE TESTS PASSED!           <<<');
  console.log('========================================================================\n');
}

runPublicDiscoveryTests().catch((err) => {
  console.error('\n*** TEST SUITE FAILED ***', err);
  process.exit(1);
});
