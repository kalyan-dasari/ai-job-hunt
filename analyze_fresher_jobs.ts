import { getDatabase } from './server/database.ts';

const db = getDatabase();
const jobs = db.prepare('SELECT title, company, location, experience_level, min_exp_years, max_exp_years, description FROM jobs').all() as any[];

console.log('Total jobs in SQLite:', jobs.length);

const companies: Record<string, number> = {};
const levels: Record<string, number> = {};

for (const j of jobs) {
  companies[j.company] = (companies[j.company] || 0) + 1;
  levels[j.experience_level] = (levels[j.experience_level] || 0) + 1;
}

console.log('\n--- Jobs by Company ---');
for (const [comp, cnt] of Object.entries(companies)) {
  console.log(`  ${comp.padEnd(20)}: ${cnt}`);
}

console.log('\n--- Jobs by Experience Level ---');
for (const [lvl, cnt] of Object.entries(levels)) {
  console.log(`  ${lvl.padEnd(20)}: ${cnt}`);
}

console.log('\n--- Title sample and why they were classified as Mid/Senior ---');
for (const j of jobs.slice(0, 20)) {
  console.log(`  [${j.company}] "${j.title}" -> Level: ${j.experience_level}, minExp: ${j.min_exp_years}`);
}

const fresherJobs = jobs.filter((j) => ['Intern', 'Entry'].includes(j.experience_level) || (j.min_exp_years != null && j.min_exp_years <= 1));
console.log('\n--- Current Fresher Jobs ---');
for (const f of fresherJobs) {
  console.log(`  [${f.company}] "${f.title}" (${f.location}) -> Level: ${f.experience_level}, minExp: ${f.min_exp_years}`);
}
