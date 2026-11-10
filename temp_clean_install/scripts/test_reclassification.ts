import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { normalizeExperienceLevel } from '../server/job-sources/normalizer.ts';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const allJobs = db.prepare('SELECT id, title, company, location, experience_level, min_exp_years, max_exp_years, fresher_status, description FROM jobs').all() as any[];

console.log('Total jobs:', allJobs.length);

let fresherCount = 0;
let experiencedCount = 0;
let unclearCount = 0;

const reclassified: any[] = [];

for (const job of allJobs) {
  const norm = normalizeExperienceLevel(job.experience_level, job.min_exp_years, job.title, job.description);
  
  if (norm.fresherStatus === 'Fresher') fresherCount++;
  else if (norm.fresherStatus === 'Experienced') experiencedCount++;
  else unclearCount++;

  if (norm.fresherStatus !== job.fresher_status) {
    reclassified.push({
      id: job.id,
      title: job.title,
      company: job.company,
      oldStatus: job.fresher_status,
      newStatus: norm.fresherStatus,
      newLevel: norm.level,
      explanation: norm.explanation
    });
  }
}

console.log('\n--- SIMULATED RE-NORMALIZATION RESULTS ---');
console.log(`Total jobs:       ${allJobs.length}`);
console.log(`Fresher-friendly: ${fresherCount}`);
console.log(`Experienced:      ${experiencedCount}`);
console.log(`Unclear:          ${unclearCount}`);
console.log(`SUM:              ${fresherCount + experiencedCount + unclearCount}`);
console.log(`Matches Total?    ${fresherCount + experiencedCount + unclearCount === allJobs.length}`);

console.log(`\nTotal jobs changing status: ${reclassified.length}`);
console.log('\nSample reclassified to Fresher:');
reclassified.filter(r => r.newStatus === 'Fresher').forEach(r => {
  console.log(`  [${r.company}] "${r.title}" (${r.oldStatus} -> ${r.newStatus}) : ${r.explanation}`);
});

console.log('\nSample reclassified to Experienced:');
reclassified.filter(r => r.newStatus === 'Experienced').slice(0, 10).forEach(r => {
  console.log(`  [${r.company}] "${r.title}" (${r.oldStatus} -> ${r.newStatus}) : ${r.explanation}`);
});
