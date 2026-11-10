import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

console.log('Connected to:', dbPath);

const totalJobs = db.prepare('SELECT count(*) as count FROM jobs').get() as { count: number };
console.log('Total jobs:', totalJobs.count);

const byFresherStatus = db.prepare('SELECT fresher_status, count(*) as count FROM jobs GROUP BY fresher_status').all();
console.log('By fresher_status column:', byFresherStatus);

const byExpLevel = db.prepare('SELECT experience_level, count(*) as count FROM jobs GROUP BY experience_level').all();
console.log('By experience_level column:', byExpLevel);

const byLocCat = db.prepare('SELECT location_category, count(*) as count FROM jobs GROUP BY location_category').all();
console.log('By location_category column:', byLocCat);

const sampleJobs = db.prepare('SELECT id, title, company, location, experience_level, min_exp_years, max_exp_years, fresher_status, location_category FROM jobs LIMIT 10').all();
console.log('Sample jobs:', JSON.stringify(sampleJobs, null, 2));

const companies = db.prepare('SELECT id, name, ats_provider, status, last_crawl_at, last_successful_crawl_at, last_error FROM company_sources').all();
console.log(`Total company sources: ${companies.length}`);
console.log('Sample company sources:', JSON.stringify(companies.slice(0, 5), null, 2));

