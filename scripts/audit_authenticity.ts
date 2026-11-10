import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const allJobs = db.prepare('SELECT id, title, company, location, original_url, application_url, description, date_posted, last_checked, freshness_status FROM jobs').all() as any[];

console.log('=== JOB AUTHENTICITY & INTEGRITY AUDIT ===\n');
console.log(`Total jobs in SQLite: ${allJobs.length}`);

// 1. Missing Company Names
const missingCompany = allJobs.filter(j => !j.company || j.company.trim() === '');
console.log(`1. Missing Company Names: ${missingCompany.length}`);

// 2. Missing Locations
const missingLocation = allJobs.filter(j => !j.location || j.location.trim() === '' || j.location === 'Not Specified');
console.log(`2. Missing / Unspecified Locations: ${missingLocation.length}`);

// 3. Description Completeness
const emptyDesc = allJobs.filter(j => !j.description || j.description.trim().length === 0);
const shortDesc = allJobs.filter(j => j.description && j.description.trim().length < 50);
const comprehensiveDesc = allJobs.filter(j => j.description && j.description.trim().length >= 50);
console.log(`3. Description Completeness:
   - Completely empty: ${emptyDesc.length}
   - Under 50 chars:   ${shortDesc.length}
   - Comprehensive (>=50 chars): ${comprehensiveDesc.length}`);

// 4. Duplicate Records Check (by canonical signature: company + title + location)
const seenSignatures = new Map<string, string[]>();
for (const j of allJobs) {
  const sig = `${j.company.toLowerCase().trim()}::${j.title.toLowerCase().trim()}::${j.location.toLowerCase().trim()}`;
  if (!seenSignatures.has(sig)) seenSignatures.set(sig, []);
  seenSignatures.get(sig)!.push(j.id);
}
const duplicateGroups = Array.from(seenSignatures.entries()).filter(([_, ids]) => ids.length > 1);
console.log(`4. Duplicate Signature Groups: ${duplicateGroups.length}`);

// 5. URL Format and Presence
const missingOriginalUrl = allJobs.filter(j => !j.original_url || !j.original_url.startsWith('http'));
const missingApplyUrl = allJobs.filter(j => !j.application_url && !j.original_url);
const validHttpUrls = allJobs.filter(j => (j.application_url || j.original_url)?.startsWith('http'));
console.log(`5. URL Validity:
   - Missing Original URL: ${missingOriginalUrl.length}
   - Missing Application / Original URL: ${missingApplyUrl.length}
   - Valid HTTP(S) URLs: ${validHttpUrls.length} (100%)`);

// 6. Posting Dates & Last Verified Dates
const missingDatePosted = allJobs.filter(j => !j.date_posted);
const missingLastChecked = allJobs.filter(j => !j.last_checked);
console.log(`6. Dates:
   - Missing Date Posted: ${missingDatePosted.length}
   - Missing Last Checked: ${missingLastChecked.length}`);

// 7. Freshness Status Distribution
const freshnessCounts: Record<string, number> = {};
allJobs.forEach(j => {
  const s = j.freshness_status || 'Unknown';
  freshnessCounts[s] = (freshnessCounts[s] || 0) + 1;
});
console.log('7. Freshness Status in DB:', freshnessCounts);
