import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const sampleJobs = db.prepare('SELECT id, company, title, application_url, original_url FROM jobs GROUP BY company LIMIT 20').all() as any[];

console.log(`Testing URL accessibility for ${sampleJobs.length} sample employers...\n`);

async function testUrls() {
  for (const j of sampleJobs) {
    const targetUrl = j.application_url || j.original_url;
    try {
      const res = await fetch(targetUrl, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(5000)
      }).catch(async () => {
        // Fallback to GET with small range
        return await fetch(targetUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(5000)
        });
      });
      console.log(`[${j.company}] HTTP ${res.status}: "${j.title.slice(0, 35)}" -> ${targetUrl.slice(0, 60)}...`);
    } catch (err: any) {
      console.log(`[${j.company}] Error (${err.message}): "${j.title.slice(0, 35)}" -> ${targetUrl.slice(0, 60)}...`);
    }
  }
}

testUrls();

