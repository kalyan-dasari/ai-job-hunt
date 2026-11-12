import { getAtsAdapter } from '../server/job-sources/ats/index.ts';

const PROBE_LIST = [
  // Lever
  { company: 'CoinDCX', provider: 'lever', slug: 'coindcx', website: 'https://coindcx.com' },
  { company: 'Dream11', provider: 'lever', slug: 'dream11', website: 'https://dream11.com' },
  { company: 'Pocket FM', provider: 'lever', slug: 'pocketfm', website: 'https://pocketfm.com' },
  { company: 'Kuku FM', provider: 'lever', slug: 'kukufm', website: 'https://kukufm.com' },
  { company: 'Chargebee', provider: 'lever', slug: 'chargebee', website: 'https://chargebee.com' },
  { company: 'Innovaccer', provider: 'lever', slug: 'innovaccer', website: 'https://innovaccer.com' },
  { company: 'Amagi', provider: 'lever', slug: 'amagi', website: 'https://amagi.com' },
  { company: 'Games24x7', provider: 'lever', slug: 'games24x7', website: 'https://games24x7.com' },
  { company: 'Lenskart', provider: 'lever', slug: 'lenskart', website: 'https://lenskart.com' },
  { company: 'Cars24', provider: 'lever', slug: 'cars24', website: 'https://cars24.com' },
  { company: 'Spinny', provider: 'lever', slug: 'spinny', website: 'https://spinny.com' },
  { company: 'Shiprocket', provider: 'lever', slug: 'shiprocket', website: 'https://shiprocket.com' },
  { company: 'PhysicsWallah', provider: 'lever', slug: 'physicswallah', website: 'https://pw.live' },
  { company: 'Unacademy', provider: 'lever', slug: 'unacademy', website: 'https://unacademy.com' },

  // Greenhouse
  { company: 'Chargebee', provider: 'greenhouse', slug: 'chargebee', website: 'https://chargebee.com' },
  { company: 'Innovaccer', provider: 'greenhouse', slug: 'innovaccer', website: 'https://innovaccer.com' },
  { company: 'CoinDCX', provider: 'greenhouse', slug: 'coindcx', website: 'https://coindcx.com' },
  { company: 'Dream11', provider: 'greenhouse', slug: 'dream11', website: 'https://dream11.com' },
  { company: 'Games24x7', provider: 'greenhouse', slug: 'games24x7', website: 'https://games24x7.com' },
  { company: 'Lenskart', provider: 'greenhouse', slug: 'lenskart', website: 'https://lenskart.com' },
  { company: 'Cars24', provider: 'greenhouse', slug: 'cars24', website: 'https://cars24.com' },
  { company: 'Spinny', provider: 'greenhouse', slug: 'spinny', website: 'https://spinny.com' },
  { company: 'Shiprocket', provider: 'greenhouse', slug: 'shiprocket', website: 'https://shiprocket.com' },
  { company: 'Amagi', provider: 'greenhouse', slug: 'amagi', website: 'https://amagi.com' },
  { company: 'Yellow.ai', provider: 'greenhouse', slug: 'yellowai', website: 'https://yellow.ai' },
  { company: 'BrowserStack', provider: 'greenhouse', slug: 'browserstack', website: 'https://browserstack.com' },
  { company: 'Postman', provider: 'greenhouse', slug: 'postman', website: 'https://postman.com' },

  // Ashby
  { company: 'Hasura', provider: 'ashby', slug: 'hasura', website: 'https://hasura.io' },
  { company: 'BrowserStack', provider: 'ashby', slug: 'browserstack', website: 'https://browserstack.com' },
  { company: 'Postman', provider: 'ashby', slug: 'postman', website: 'https://postman.com' },
  { company: 'CleverTap', provider: 'ashby', slug: 'clevertap', website: 'https://clevertap.com' },
  { company: 'Pocket FM', provider: 'ashby', slug: 'pocketfm', website: 'https://pocketfm.com' },
  { company: 'Kuku FM', provider: 'ashby', slug: 'kukufm', website: 'https://kukufm.com' },
  { company: 'Urban Company', provider: 'ashby', slug: 'urbancompany', website: 'https://urbancompany.com' },

  // SmartRecruiters
  { company: 'Lenskart', provider: 'smartrecruiters', slug: 'lenskart', website: 'https://lenskart.com' },
  { company: 'Cars24', provider: 'smartrecruiters', slug: 'cars24', website: 'https://cars24.com' },
  { company: 'Spinny', provider: 'smartrecruiters', slug: 'spinny', website: 'https://spinny.com' },
];

async function run() {
  console.log(`Probing ${PROBE_LIST.length} candidates...\n`);
  const hits: any[] = [];
  for (const item of PROBE_LIST) {
    const adapter = getAtsAdapter(item.provider);
    if (!adapter) continue;
    try {
      const res = await adapter.fetchJobs(item.slug, {
        name: item.company,
        websiteUrl: item.website,
        careersUrl: item.website,
      });
      if (res.jobs && res.jobs.length > 0) {
        console.log(`[HIT!] ${item.company.padEnd(16)} [${item.provider.padEnd(14)}] slug: ${item.slug.padEnd(15)} -> ${res.jobs.length} jobs!`);
        hits.push({ ...item, jobs: res.jobs.length });
      }
    } catch (e: any) {
      // ignore
    }
  }

  console.log('\n=======================================');
  console.log(`FOUND ${hits.length} ACTIVE LIVE ATS BOARDS:`);
  console.log('=======================================');
  hits.forEach((h) => console.log(`- ${h.company} (${h.provider}): ${h.slug} (${h.jobs} jobs)`));
}

run();
