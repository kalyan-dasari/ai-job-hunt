import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const companies = db.prepare('SELECT id, name, ats_provider, ats_slug FROM company_sources ORDER BY id').all() as any[];
console.log('Total companies in DB:', companies.length);
companies.forEach((c, i) => console.log(`${i+1}. ${c.id}: ${c.name} (${c.ats_provider}, slug: ${c.ats_slug})`));

