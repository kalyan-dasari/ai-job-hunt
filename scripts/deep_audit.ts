import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

console.log('=== DEEP AUDIT OF JOBPILOT SQLITE DATABASE ===');
console.log('Database path:', dbPath);

// 1. Total jobs
const totalJobs = (db.prepare('SELECT count(*) as c FROM jobs').get() as any).c;
console.log('\nTotal Jobs in DB:', totalJobs);

// 2. Company Sources Count & List
const companies = db.prepare('SELECT id, name, ats_provider, ats_slug, website_url, careers_url, status, last_crawl_at, last_successful_crawl_at, last_error, jobs_count FROM company_sources').all() as any[];
console.log(`\nCompany Sources Count: ${companies.length}`);
companies.forEach((c, idx) => {
  console.log(`${idx + 1}. [${c.id}] ${c.name} (${c.ats_provider}) - Status: ${c.status}, Last crawl: ${c.last_crawl_at || 'never'}, Last success: ${c.last_successful_crawl_at || 'never'}, Error: ${c.last_error ? c.last_error.slice(0, 50) : 'none'}, Jobs in DB: ${c.jobs_count}`);
});

// 3. Inspect Experience fields across all jobs
const allJobs = db.prepare('SELECT id, title, company, location, experience_level, min_exp_years, max_exp_years, fresher_status, location_category, original_url, application_url, freshness_status, description FROM jobs').all() as any[];

console.log('\n--- Distribution of fresher_status in DB ---');
const fresherStatusCounts: Record<string, number> = {};
allJobs.forEach(j => {
  const s = j.fresher_status ?? 'NULL';
  fresherStatusCounts[s] = (fresherStatusCounts[s] || 0) + 1;
});
console.log(fresherStatusCounts);

console.log('\n--- Distribution of experience_level in DB ---');
const expLevelCounts: Record<string, number> = {};
allJobs.forEach(j => {
  const s = j.experience_level ?? 'NULL';
  expLevelCounts[s] = (expLevelCounts[s] || 0) + 1;
});
console.log(expLevelCounts);

// 4. Find all jobs currently marked Fresher
const fresherJobs = allJobs.filter(j => j.fresher_status === 'Fresher');
console.log(`\n--- Fresher Jobs (${fresherJobs.length}) ---`);
fresherJobs.forEach((j, i) => {
  console.log(`${i + 1}. "${j.title}" at ${j.company} (${j.location}) | Exp: ${j.experience_level} (${j.min_exp_years}-${j.max_exp_years}y) | AppURL: ${j.application_url || j.original_url}`);
});

// 5. Look for conflicting jobs: e.g. fresher_status === 'Unclear' but experience_level is 'Lead' or 'Senior' or min_exp_years >= 3
const unclearWithSeniority = allJobs.filter(j => j.fresher_status === 'Unclear' && (['Lead', 'Senior'].includes(j.experience_level) || (j.min_exp_years !== null && j.min_exp_years >= 3)));
console.log(`\n--- Conflicting Jobs: fresher_status='Unclear' BUT experience indicates Senior/Lead/3+yrs (${unclearWithSeniority.length}) ---`);
unclearWithSeniority.slice(0, 10).forEach(j => {
  console.log(`  "${j.title}" at ${j.company} | exp_lvl: ${j.experience_level}, min_exp: ${j.min_exp_years}, max_exp: ${j.max_exp_years}`);
});

// 6. Look for unclear jobs that actually have experience mentions in description or title
const unclearWithExpInDesc = allJobs.filter(j => {
  if (j.fresher_status !== 'Unclear') return false;
  const text = `${j.title} ${j.description || ''}`.toLowerCase();
  return /\b(\d+)\+?\s*(?:to|-)\s*(\d+)?\s*(?:years?|yrs?)\b|\b(?:freshers?|intern(?:ship)?|0\s*-\s*1|0\s*-\s*2)\b/.test(text);
});
console.log(`\n--- Unclear Jobs with Experience patterns in Title/Desc: (${unclearWithExpInDesc.length}) ---`);
unclearWithExpInDesc.slice(0, 10).forEach(j => {
  console.log(`  "${j.title}" at ${j.company}`);
});

// 7. Inspect Location Strings across all 277 jobs
console.log('\n--- Location Categories in DB ---');
const locCatCounts: Record<string, number> = {};
allJobs.forEach(j => {
  const c = j.location_category ?? 'NULL';
  locCatCounts[c] = (locCatCounts[c] || 0) + 1;
});
console.log(locCatCounts);

