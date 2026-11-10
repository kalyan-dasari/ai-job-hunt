import { DatabaseSync } from 'node:sqlite';
import { classifyDetailedLocation } from '../server/job-sources/normalizer.ts';

const db = new DatabaseSync('data/jobpilot.db');
const jobs = db.prepare('SELECT id, title, company, location, work_arrangement, country, description, location_category FROM jobs').all() as any[];

console.log(`Total jobs audited in SQLite: ${jobs.length}`);

// Group into the 5 requested categories:
// 1. India city
// 2. Remote within India
// 3. International remote explicitly open to India
// 4. International location
// 5. Unknown

const buckets = {
  indiaCity: [] as any[],
  remoteIndia: [] as any[],
  intlRemoteOpenToIndia: [] as any[],
  intlLocation: [] as any[],
  unknown: [] as any[],
};

for (const job of jobs) {
  const detailed = classifyDetailedLocation(job.location, job.work_arrangement, job.country, job.description);
  
  if (detailed.category === 'Bengaluru' || 
      detailed.category === 'Hyderabad' || 
      detailed.category === 'Chennai' || 
      detailed.category === 'Pune' || 
      detailed.category === 'Mumbai' || 
      detailed.category === 'Delhi NCR' || 
      detailed.category === 'Other Indian cities') {
    buckets.indiaCity.push({ ...job, matchedCity: detailed.matchedCity, subcategory: detailed.category });
  } else if (detailed.category === 'Remote India') {
    buckets.remoteIndia.push(job);
  } else if (detailed.category === 'International remote explicitly open to India') {
    buckets.intlRemoteOpenToIndia.push(job);
  } else if (detailed.category === 'International location') {
    buckets.intlLocation.push(job);
  } else {
    buckets.unknown.push(job);
  }
}

console.log('\n--- 5-CATEGORY AUDIT SUMMARY ---');
console.log(`1. India city:                                    ${buckets.indiaCity.length}`);
console.log(`2. Remote within India:                           ${buckets.remoteIndia.length}`);
console.log(`3. International remote explicitly open to India: ${buckets.intlRemoteOpenToIndia.length}`);
console.log(`4. International location:                        ${buckets.intlLocation.length}`);
console.log(`5. Unknown:                                       ${buckets.unknown.length}`);
console.log(`Sum:                                              ${buckets.indiaCity.length + buckets.remoteIndia.length + buckets.intlRemoteOpenToIndia.length + buckets.intlLocation.length + buckets.unknown.length}`);

console.log('\n--- INDIA CITY SUBCATEGORIES ---');
const cityCounts: Record<string, number> = {};
for (const j of buckets.indiaCity) {
  cityCounts[j.subcategory] = (cityCounts[j.subcategory] || 0) + 1;
}
for (const [k, v] of Object.entries(cityCounts)) {
  console.log(`  - ${k}: ${v}`);
}

console.log('\n--- INTERNATIONAL LOCATION JOBS (NON-INDIA) ---');
for (const j of buckets.intlLocation) {
  console.log(`  - [${j.company}] "${j.title}" | Location: "${j.location}" | Stored Category: "${j.location_category}"`);
}

if (buckets.intlRemoteOpenToIndia.length > 0) {
  console.log('\n--- INTL REMOTE OPEN TO INDIA ---');
  for (const j of buckets.intlRemoteOpenToIndia) {
    console.log(`  - [${j.company}] "${j.title}" | Location: "${j.location}"`);
  }
}

if (buckets.unknown.length > 0) {
  console.log('\n--- UNKNOWN LOCATION JOBS ---');
  for (const j of buckets.unknown) {
    console.log(`  - [${j.company}] "${j.title}" | Location: "${j.location}"`);
  }
}
