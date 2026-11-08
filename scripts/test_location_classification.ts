import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'jobpilot.db');
const db = new DatabaseSync(dbPath);

const allJobs = db.prepare('SELECT id, title, company, location, work_arrangement, country, description, location_category FROM jobs').all() as any[];

export type DetailedLocationCategory = 
  | 'Hyderabad'
  | 'Bengaluru'
  | 'Chennai'
  | 'Pune'
  | 'Mumbai'
  | 'Delhi NCR'
  | 'Other Indian cities'
  | 'Remote India'
  | 'International remote explicitly open to India'
  | 'International location'
  | 'Unknown';

export function classifyDetailedLocation(
  locRaw?: string,
  workArrangement?: string,
  country?: string,
  descRaw?: string
): { category: DetailedLocationCategory; matchedCity?: string } {
  const loc = (locRaw || '').toLowerCase().trim();
  const desc = (descRaw || '').toLowerCase().slice(0, 1000);
  const arr = (workArrangement || '').toLowerCase();

  // Foreign Signals
  const foreignSignals = [
    'united kingdom', 'london', 'united states', 'usa', 'us only', 'berlin', 'germany',
    'paris', 'france', 'tokyo', 'japan', 'singapore', 'sydney', 'australia', 'canada',
    'amsterdam', 'netherlands', 'austria', 'vienna', 'dublin', 'ireland', 'indonesia', 'virginia beach', 'durham, nc', 'washington'
  ];
  const isForeign = foreignSignals.some(f => loc.includes(f));
  const hasIndiaExplicit = loc.includes('india') || loc.includes('hyderabad') || loc.includes('bengaluru') || loc.includes('bangalore') || loc.includes('mumbai') || loc.includes('chennai') || loc.includes('pune');

  if (isForeign && !hasIndiaExplicit) {
    return { category: 'International location' };
  }

  // 1. Remote India
  const isRemote = arr === 'remote' || loc.includes('remote') || loc.includes('wfh');
  const isIndia = loc.includes('india') || country?.toLowerCase() === 'india' || hasIndiaExplicit;

  if (isRemote && (loc === 'remote - india' || loc === 'remote, india' || (isIndia && !loc.includes('hyderabad') && !loc.includes('bengaluru') && !loc.includes('bangalore') && !loc.includes('chennai') && !loc.includes('pune') && !loc.includes('mumbai') && !loc.includes('delhi') && !loc.includes('noida') && !loc.includes('gurgaon')))) {
    return { category: 'Remote India' };
  }

  // 2. Specific Indian Cities (Primary)
  if (loc.includes('hyderabad')) return { category: 'Hyderabad', matchedCity: 'Hyderabad' };
  if (loc.includes('bengaluru') || loc.includes('bangalore')) return { category: 'Bengaluru', matchedCity: 'Bengaluru' };
  if (loc.includes('chennai')) return { category: 'Chennai', matchedCity: 'Chennai' };
  if (loc.includes('pune')) return { category: 'Pune', matchedCity: 'Pune' };
  if (loc.includes('mumbai') || loc.includes('navi mumbai')) return { category: 'Mumbai', matchedCity: 'Mumbai' };
  if (loc.includes('delhi') || loc.includes('noida') || loc.includes('gurgaon') || loc.includes('gurugram') || loc.includes('faridabad')) {
    return { category: 'Delhi NCR', matchedCity: 'Delhi NCR' };
  }

  // 3. Other Indian Cities
  const otherCities = [
    'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'gujarat',
    'chandigarh', 'ludhiana', 'punjab',
    'lucknow', 'uttar pradesh',
    'kolkata', 'west bengal',
    'bhubaneswar', 'odisha',
    'kochi', 'kerala', 'trivandrum', 'thiruvananthapuram',
    'indore', 'madhya pradesh', 'bhopal',
    'jaipur', 'rajasthan',
    'tamil nadu', 'coimbatore'
  ];
  if (otherCities.some(c => loc.includes(c))) {
    return { category: 'Other Indian cities' };
  }

  // 4. General "India"
  if (loc === 'india' || loc.includes('india')) {
    if (isRemote) return { category: 'Remote India' };
    return { category: 'Other Indian cities', matchedCity: 'All India' };
  }

  // 5. International remote open to India
  if (loc.includes('worldwide') || loc.includes('global') || loc.includes('india or eu')) {
    return { category: 'International remote explicitly open to India' };
  }

  if (isForeign) {
    return { category: 'International location' };
  }

  return { category: 'Unknown' };
}

const counts: Record<DetailedLocationCategory, number> = {
  'Hyderabad': 0,
  'Bengaluru': 0,
  'Chennai': 0,
  'Pune': 0,
  'Mumbai': 0,
  'Delhi NCR': 0,
  'Other Indian cities': 0,
  'Remote India': 0,
  'International remote explicitly open to India': 0,
  'International location': 0,
  'Unknown': 0
};

for (const j of allJobs) {
  const res = classifyDetailedLocation(j.location, j.work_arrangement, j.country, j.description);
  counts[res.category]++;
}

console.log('=== DETAILED MUTUALLY EXCLUSIVE LOCATION BREAKDOWN (277 JOBS) ===');
let sum = 0;
for (const [cat, count] of Object.entries(counts)) {
  console.log(`- ${cat.padEnd(46)}: ${count}`);
  sum += count;
}
console.log(`TOTAL SUM: ${sum} / 277 (Matches: ${sum === allJobs.length})`);
