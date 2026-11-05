import { getAtsAdapter } from './server/job-sources/ats/index.ts';

const candidateCompanies = [
  // Hyderabad
  { name: 'Darwinbox', provider: 'greenhouse', slug: 'darwinbox', city: 'Hyderabad' },
  { name: 'Darwinbox', provider: 'lever', slug: 'darwinbox', city: 'Hyderabad' },
  { name: 'Darwinbox', provider: 'workable', slug: 'darwinbox', city: 'Hyderabad' },
  { name: 'Zenoti', provider: 'smartrecruiters', slug: 'zenoti', city: 'Hyderabad' },
  { name: 'Zenoti', provider: 'greenhouse', slug: 'zenoti', city: 'Hyderabad' },
  { name: 'HighRadius', provider: 'smartrecruiters', slug: 'highradius', city: 'Hyderabad' },
  { name: 'HighRadius', provider: 'greenhouse', slug: 'highradius', city: 'Hyderabad' },
  { name: 'Keka', provider: 'greenhouse', slug: 'keka', city: 'Hyderabad' },
  { name: 'Keka', provider: 'lever', slug: 'keka', city: 'Hyderabad' },
  { name: 'Ozonetel', provider: 'lever', slug: 'ozonetel', city: 'Hyderabad' },
  { name: 'Ozonetel', provider: 'recruitee', slug: 'ozonetel', city: 'Hyderabad' },

  // Bengaluru
  { name: 'Apna', provider: 'workable', slug: 'apna', city: 'Bengaluru' },
  { name: 'Fortanix', provider: 'workable', slug: 'fortanix', city: 'Bengaluru' },
  { name: 'Swiggy', provider: 'greenhouse', slug: 'swiggy', city: 'Bengaluru' },
  { name: 'Ather Energy', provider: 'greenhouse', slug: 'atherenergy', city: 'Bengaluru' },
  { name: 'Khatabook', provider: 'lever', slug: 'khatabook', city: 'Bengaluru' },
  { name: 'CoinSwitch', provider: 'greenhouse', slug: 'coinswitch', city: 'Bengaluru' },
  { name: 'Juspay', provider: 'greenhouse', slug: 'juspay', city: 'Bengaluru' },
  { name: 'Slice', provider: 'greenhouse', slug: 'slice', city: 'Bengaluru' },
  { name: 'Slice', provider: 'greenhouse', slug: 'sliceit', city: 'Bengaluru' },
  { name: 'Postman', provider: 'greenhouse', slug: 'postman', city: 'Bengaluru' },
  { name: 'HackerEarth', provider: 'recruitee', slug: 'hackerearth', city: 'Bengaluru' },
  { name: 'Hasura', provider: 'ashby', slug: 'hasura', city: 'Bengaluru' },
  { name: 'Urban Company', provider: 'ashby', slug: 'urbancompany', city: 'Bengaluru' },
  { name: 'Yellow.ai', provider: 'greenhouse', slug: 'yellowai', city: 'Bengaluru' },

  // Chennai & Pune
  { name: 'Chargebee', provider: 'lever', slug: 'chargebee', city: 'Chennai' },
  { name: 'Chargebee', provider: 'greenhouse', slug: 'chargebee', city: 'Chennai' },
  { name: 'Freshworks', provider: 'smartrecruiters', slug: 'Freshworks', city: 'Chennai' },
  { name: 'Druva', provider: 'greenhouse', slug: 'druva', city: 'Pune' },
  { name: 'Mindtickle', provider: 'lever', slug: 'mindtickle', city: 'Pune' },
  { name: 'Mindtickle', provider: 'greenhouse', slug: 'mindtickle', city: 'Pune' },
  { name: 'Icertis', provider: 'smartrecruiters', slug: 'icertis', city: 'Pune' },

  // AI & SaaS Startups
  { name: 'Observe.ai', provider: 'greenhouse', slug: 'observeai', city: 'Bengaluru' },
  { name: 'Observe.ai', provider: 'lever', slug: 'observeai', city: 'Bengaluru' },
  { name: 'Rephrase.ai', provider: 'lever', slug: 'rephraseai', city: 'Bengaluru' },
  { name: 'Sarvam AI', provider: 'ashby', slug: 'sarvamai', city: 'Bengaluru' },
  { name: 'Sarvam AI', provider: 'lever', slug: 'sarvam', city: 'Bengaluru' },
];

async function probe() {
  console.log(`Probing ${candidateCompanies.length} candidate company ATS endpoints...`);
  const verified: any[] = [];

  for (const c of candidateCompanies) {
    const adapter = getAtsAdapter(c.provider);
    if (!adapter) continue;
    try {
      const res = await adapter.fetchJobs(c.slug, c.name, { limit: 5 });
      if (res.success && res.jobs.length > 0) {
        console.log(`[VERIFIED] ${c.name} (${c.city}) on ${c.provider} [${c.slug}] -> ${res.jobs.length} jobs. Sample: "${res.jobs[0].title}" (${res.jobs[0].location})`);
        verified.push({ ...c, jobsCount: res.jobs.length, sampleJob: res.jobs[0] });
      }
    } catch {}
  }

  console.log(`\nFound ${verified.length} verified active company endpoints!`);
}

probe();
