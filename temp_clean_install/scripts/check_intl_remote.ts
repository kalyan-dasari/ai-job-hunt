import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const rows = db.prepare("SELECT id, title, company, location, work_arrangement, country, description, location_category FROM jobs WHERE location_category = 'International remote explicitly open to India'").all() as any[];
console.log('Jobs with location_category = "International remote explicitly open to India":', rows.length);
rows.forEach(r => console.log(`- [${r.company}] "${r.title}" (loc: ${r.location}, country: ${r.country}, arr: ${r.work_arrangement})`));
