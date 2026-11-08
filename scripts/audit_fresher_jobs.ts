import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { normalizeExperienceLevel } from '../server/job-sources/normalizer.ts';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const allJobs = db.prepare('SELECT id, title, company, location, experience_level, min_exp_years, max_exp_years, fresher_status, description, original_url, application_url FROM jobs').all() as any[];

const fresherJobs: any[] = [];
for (const job of allJobs) {
  const norm = normalizeExperienceLevel(job.experience_level, job.min_exp_years, job.title, job.description);
  if (norm.fresherStatus === 'Fresher') {
    fresherJobs.push({
      ...job,
      normLevel: norm.level,
      normMin: norm.minYears,
      normMax: norm.maxYears,
      normExplanation: norm.explanation
    });
  }
}

console.log(`=== FULL AUDIT OF ALL ${fresherJobs.length} FRESHER-FRIENDLY JOBS ===\n`);

fresherJobs.forEach((j, i) => {
  // Find evidence snippet in description or title
  const text = `${j.title} ${j.description || ''}`;
  const match = text.match(/\b(?:freshers?|intern(?:ship)?|trainee|graduate|0\s*[-–to]\s*[12]|1\s*[-–to]\s*2|junior|associate)\b/i);
  const evidenceSnippet = match ? text.slice(Math.max(0, match.index! - 30), Math.min(text.length, match.index! + 70)).replace(/\s+/g, ' ') : j.normExplanation;

  console.log(`[Job ${i + 1}] "${j.title}"`);
  console.log(`  Company:     ${j.company}`);
  console.log(`  Location:    ${j.location}`);
  console.log(`  Exp Req:     Level=${j.normLevel}, Min=${j.normMin ?? 0}y, Max=${j.normMax ?? 2}y`);
  console.log(`  Evidence:    "...${evidenceSnippet.trim()}..."`);
  console.log(`  OriginalURL: ${j.original_url}`);
  console.log(`  ApplyURL:    ${j.application_url || j.original_url}`);
  console.log('--------------------------------------------------------------------------------');
});
