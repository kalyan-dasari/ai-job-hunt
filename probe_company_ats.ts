import { getAtsAdapter } from './server/job-sources/ats/index.ts';

const candidateCompanies2 = [
  { name: 'Glean', provider: 'ashby', slug: 'glean' },
  { name: 'Glean', provider: 'greenhouse', slug: 'glean' },
  { name: 'Chargebee', provider: 'greenhouse', slug: 'chargebee' },
  { name: 'Chargebee', provider: 'lever', slug: 'chargebee' },
  { name: 'Ather Energy', provider: 'lever', slug: 'atherenergy' },
  { name: 'Ather Energy', provider: 'greenhouse', slug: 'ather' },
  { name: 'Darwinbox', provider: 'greenhouse', slug: 'darwinbox' },
  { name: 'Darwinbox', provider: 'smartrecruiters', slug: 'darwinbox' },
  { name: 'Keka', provider: 'smartrecruiters', slug: 'keka' },
  { name: 'Keka', provider: 'workable', slug: 'keka' },
  { name: 'Swiggy', provider: 'lever', slug: 'swiggy' },
  { name: 'Swiggy', provider: 'smartrecruiters', slug: 'swiggy' },
  { name: 'Razorpay', provider: 'greenhouse', slug: 'razorpaysoftwareprivatelimited' },
  { name: 'Razorpay', provider: 'lever', slug: 'razorpay' },
  { name: 'Razorpay', provider: 'workable', slug: 'razorpay' },
  { name: 'Postman', provider: 'greenhouse', slug: 'postman' },
  { name: 'Hasura', provider: 'ashby', slug: 'hasura' },
  { name: 'BrowserStack', provider: 'greenhouse', slug: 'browserstack' },
  { name: 'Yellow.ai', provider: 'greenhouse', slug: 'yellowai' },
  { name: 'MoEngage', provider: 'greenhouse', slug: 'moengage' },
  { name: 'HackerEarth', provider: 'recruitee', slug: 'hackerearth' },
  { name: 'Urban Company', provider: 'ashby', slug: 'urbancompany' },
  { name: 'Shiprocket', provider: 'smartrecruiters', slug: 'Shiprocket' },
  { name: 'DeepSource', provider: 'lever', slug: 'deepsource' },
  { name: 'DeepSource', provider: 'greenhouse', slug: 'deepsource' },
  { name: 'SigNoz', provider: 'ashby', slug: 'signoz' },
  { name: 'SigNoz', provider: 'lever', slug: 'signoz' },
  { name: 'Loco', provider: 'lever', slug: 'loco' },
  { name: 'Kite', provider: 'lever', slug: 'zerodha' },
];

async function probe() {
  for (const c of candidateCompanies2) {
    const adapter = getAtsAdapter(c.provider);
    if (!adapter) continue;
    try {
      const res = await adapter.fetchJobs(c.slug, c.name, { limit: 5 });
      if (res.success && res.jobs.length > 0) {
        console.log(`[VERIFIED] ${c.name} on ${c.provider} [${c.slug}] -> ${res.jobs.length} jobs. Sample: "${res.jobs[0].title}" (${res.jobs[0].location})`);
      }
    } catch {}
  }
}

probe();
