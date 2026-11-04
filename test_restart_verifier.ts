import path from 'node:path';
import { initDatabase, closeDatabase, candidateRepository, jobsRepository, applicationsRepository } from './server/database.ts';

const dbPath = process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'test_restart_lifecycle.db');
console.log(`[Process 2 - Verifier] Connecting to database at ${dbPath} in a BRAND NEW Node.js process...`);
initDatabase(dbPath);

console.log('[Process 2 - Verifier] 1. Verifying Candidate Profile & Resume Version...');
const profile = candidateRepository.getProfile();
console.log(`  Candidate Name: "${profile.name}"`);
console.log(`  Candidate Email: "${profile.email}"`);
console.log(`  Skills Count: ${profile.skills.length} (${profile.skills.slice(0, 3).join(', ')}...)`);
console.log(`  Resume Versions Count: ${profile.resumeVersions.length}`);
console.log(`  Active Resume Version: "${profile.resumeVersions[0]?.fileName}" (isActive: ${profile.resumeVersions[0]?.isActive})`);

if (
  profile.name !== 'Kavya Patel' ||
  profile.email !== 'kavya.patel@example.com' ||
  !profile.skills.includes('TypeScript') ||
  profile.resumeVersions.length !== 1 ||
  profile.resumeVersions[0].fileName !== 'Kavya_Patel_Resume.pdf' ||
  !profile.resumeVersions[0].isActive ||
  !profile.rawResumeText.includes('Zeta Dynamics')
) {
  console.error('[Process 2 - Verifier] FAIL: Candidate profile or resume versions did not persist across restart!');
  process.exit(1);
}
console.log('  -> PASS: Candidate profile and resume versions survived process restart perfectly.');

console.log('[Process 2 - Verifier] 2. Verifying Jobs Catalog...');
const allJobs = jobsRepository.getAllJobs();
console.log(`  Total Jobs In Catalog: ${allJobs.length}`);

const job1 = allJobs.find((j) => j.id === 'job-restart-101');
const job2 = allJobs.find((j) => j.id === 'job-restart-102');

if (!job1 || !job2) {
  console.error('[Process 2 - Verifier] FAIL: Jobs were missing after process restart!');
  process.exit(1);
}

console.log(`  Job 1: "${job1.title}" at "${job1.company}" (Match: ${job1.matchResult?.overallScore}%)`);
console.log(`  Job 2: "${job2.title}" at "${job2.company}" (isSaved: ${job2.isSaved})`);

if (
  job1.company !== 'Zeta Dynamics' ||
  job1.title !== 'Senior Full-Stack Engineer' ||
  job1.matchResult?.overallScore !== 94 ||
  job2.company !== 'Nexus Infra' ||
  job2.isSaved !== true
) {
  console.error('[Process 2 - Verifier] FAIL: Job attributes or saved status altered across process restart!');
  process.exit(1);
}
console.log('  -> PASS: Both jobs and their match/saved states survived process restart perfectly.');

console.log('[Process 2 - Verifier] 3. Verifying Applications Store...');
const applications = applicationsRepository.getAllApplications();
console.log(`  Total Tracked Applications: ${applications.length}`);

const app1 = applications.find((a) => a.jobId === 'job-restart-101');
if (!app1) {
  console.error('[Process 2 - Verifier] FAIL: Application for job-restart-101 not found after process restart!');
  process.exit(1);
}

console.log(`  Application ID: "${app1.id}"`);
console.log(`  Associated Job: "${app1.jobTitle}" at "${app1.company}"`);
console.log(`  Current Stage: "${app1.status}"`);
console.log(`  Timeline Events: ${app1.timeline.length}`);

if (
  app1.company !== 'Zeta Dynamics' ||
  app1.status !== 'Preparing' ||
  app1.timeline.length < 1
) {
  console.error('[Process 2 - Verifier] FAIL: Application record data corrupted or incomplete after process restart!');
  process.exit(1);
}
console.log('  -> PASS: Application and full lifecycle timeline survived process restart perfectly.');

closeDatabase();
console.log('[Process 2 - Verifier] Verification process finished with 100% success!');
process.exit(0);

