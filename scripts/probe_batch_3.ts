import { getAtsAdapter } from '../server/job-sources/ats/index.ts';

const BATCH_3 = [
  // Whatfix
  { company: 'Whatfix', provider: 'greenhouse', slug: 'whatfix', website: 'https://whatfix.com' },
  { company: 'Whatfix', provider: 'lever', slug: 'whatfix', website: 'https://whatfix.com' },

  // Kore.ai (Hyderabad AI startup)
  { company: 'Kore.ai', provider: 'greenhouse', slug: 'koreai', website: 'https://kore.ai' },
  { company: 'Kore.ai', provider: 'lever', slug: 'koreai', website: 'https://kore.ai' },

  // Darwinbox (Hyderabad HR tech unicorn)
  { company: 'Darwinbox', provider: 'lever', slug: 'darwinbox', website: 'https://darwinbox.com' },

  // Jupiter / Epifi
  { company: 'Jupiter Money', provider: 'greenhouse', slug: 'jupitermoney', website: 'https://jupiter.money' },
  { company: 'Jupiter Money', provider: 'lever', slug: 'jupiter', website: 'https://jupiter.money' },
  { company: 'Fi Money', provider: 'greenhouse', slug: 'epifi', website: 'https://fi.money' },
  { company: 'Fi Money', provider: 'lever', slug: 'epifi', website: 'https://fi.money' },

  // Scaler / InterviewBit
  { company: 'Scaler', provider: 'greenhouse', slug: 'scaler', website: 'https://scaler.com' },
  { company: 'Scaler', provider: 'lever', slug: 'scaler', website: 'https://scaler.com' },

  // FarEye
  { company: 'FarEye', provider: 'greenhouse', slug: 'fareye', website: 'https://fareye.com' },
  { company: 'FarEye', provider: 'lever', slug: 'fareye', website: 'https://fareye.com' },

  // Shipsy
  { company: 'Shipsy', provider: 'greenhouse', slug: 'shipsy', website: 'https://shipsy.io' },
  { company: 'Shipsy', provider: 'lever', slug: 'shipsy', website: 'https://shipsy.io' },

  // Bizongo
  { company: 'Bizongo', provider: 'lever', slug: 'bizongo', website: 'https://bizongo.com' },
  { company: 'Bizongo', provider: 'greenhouse', slug: 'bizongo', website: 'https://bizongo.com' },

  // Lentra
  { company: 'Lentra', provider: 'lever', slug: 'lentra', website: 'https://lentra.ai' },

  // Leap Scholar
  { company: 'Leap Scholar', provider: 'lever', slug: 'leapscholar', website: 'https://leapscholar.com' },
  { company: 'Leap Finance', provider: 'lever', slug: 'leapfinance', website: 'https://leapfinance.com' },

  // Perfios
  { company: 'Perfios', provider: 'greenhouse', slug: 'perfios', website: 'https://perfios.com' },
  { company: 'Perfios', provider: 'lever', slug: 'perfios', website: 'https://perfios.com' },

  // BrowserStack on Breezy / Workable / Lever
  { company: 'BrowserStack', provider: 'lever', slug: 'browserstack-technologies', website: 'https://browserstack.com' },
  { company: 'BrowserStack', provider: 'breezy', slug: 'browserstack', website: 'https://browserstack.com' },

  // Postman on Breezy / Workable
  { company: 'Postman', provider: 'breezy', slug: 'postman', website: 'https://postman.com' },
  { company: 'Postman', provider: 'workable', slug: 'postman', website: 'https://postman.com' },

  // Hasura on Workable
  { company: 'Hasura', provider: 'workable', slug: 'hasura', website: 'https://hasura.io' },

  // Urban Company on Workable / Greenhouse
  { company: 'Urban Company', provider: 'workable', slug: 'urbancompany', website: 'https://urbancompany.com' },
  { company: 'Urban Company', provider: 'greenhouse', slug: 'urban-company', website: 'https://urbancompany.com' },

  // Zepto on Workable
  { company: 'Zepto', provider: 'workable', slug: 'zepto', website: 'https://zeptonow.com' },

  // Yellow.ai on Workable
  { company: 'Yellow.ai', provider: 'workable', slug: 'yellowai', website: 'https://yellow.ai' },
  { company: 'Yellow.ai', provider: 'workable', slug: 'yellow-ai', website: 'https://yellow.ai' },

  // CleverTap on Workable
  { company: 'CleverTap', provider: 'workable', slug: 'clevertap', website: 'https://clevertap.com' },

  // MoEngage on Workable / Lever
  { company: 'MoEngage', provider: 'workable', slug: 'moengage', website: 'https://moengage.com' },
  { company: 'MoEngage', provider: 'lever', slug: 'moengage', website: 'https://moengage.com' },
];

async function runBatch() {
  console.log(`Probing ${BATCH_3.length} batch-3 candidates...\n`);
  const hits: any[] = [];
  for (const item of BATCH_3) {
    const adapter = getAtsAdapter(item.provider);
    if (!adapter) continue;
    try {
      const res = await adapter.fetchJobs(item.slug, {
        name: item.company,
        websiteUrl: item.website,
        careersUrl: item.website,
      });
      if (res.jobs && res.jobs.length > 0) {
        console.log(`[HIT!] ${item.company.padEnd(16)} [${item.provider.padEnd(14)}] slug: ${item.slug.padEnd(20)} -> ${res.jobs.length} jobs!`);
        hits.push({ ...item, jobs: res.jobs.length });
      }
    } catch {}
  }

  console.log('\n=======================================');
  console.log(`FOUND ${hits.length} ACTIVE LIVE ATS BOARDS IN BATCH 3:`);
  console.log('=======================================');
  hits.forEach((h) => console.log(`- ${h.company} (${h.provider}): ${h.slug} (${h.jobs} jobs)`));
}

runBatch();
