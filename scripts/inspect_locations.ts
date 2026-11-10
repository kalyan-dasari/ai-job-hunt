import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const locations = db.prepare('SELECT location, count(*) as count FROM jobs GROUP BY location ORDER BY count DESC').all() as any[];
console.log(`Total distinct location strings: ${locations.length}`);
locations.forEach(l => {
  console.log(`- "${l.location}": ${l.count} jobs`);
});

