import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const decisionsJobs = db.prepare('SELECT id, title, company, experience_level, min_exp_years, max_exp_years, fresher_status, description FROM jobs WHERE company LIKE "%Decisions%"').all() as any[];
console.log('Decisions jobs:', decisionsJobs.length);
decisionsJobs.forEach(j => {
  console.log(`- "${j.title}" | fresher_status: ${j.fresher_status}, exp_level: ${j.experience_level}, min: ${j.min_exp_years}, max: ${j.max_exp_years}`);
});
