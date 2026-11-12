import { getAtsAdapter } from '../server/job-sources/ats/index.ts';
import { isIndiaEligibleJob } from '../server/job-sources/normalizer.ts';

const EXPANSION_CANDIDATES = [
  // Ashby
  { company: 'PostHog', provider: 'ashby', slug: 'posthog', website: 'https://posthog.com' },
  { company: 'Linear', provider: 'ashby', slug: 'linear', website: 'https://linear.app' },
  { company: 'Supabase', provider: 'ashby', slug: 'supabase', website: 'https://supabase.com' },
  { company: 'Railway', provider: 'ashby', slug: 'railway', website: 'https://railway.app' },
  { company: 'Render', provider: 'ashby', slug: 'render', website: 'https://render.com' },
  { company: 'Ramp', provider: 'ashby', slug: 'ramp', website: 'https://ramp.com' },

  // Greenhouse
  { company: 'Thoughtworks', provider: 'greenhouse', slug: 'thoughtworks', website: 'https://thoughtworks.com' },
  { company: 'Branch', provider: 'greenhouse', slug: 'branch', website: 'https://branch.io' },
  { company: 'Retool', provider: 'greenhouse', slug: 'retool', website: 'https://retool.com' },
  { company: 'Elastic', provider: 'greenhouse', slug: 'elastic', website: 'https://elastic.co' },
  { company: 'GitLab', provider: 'greenhouse', slug: 'gitlab', website: 'https://gitlab.com' },
  { company: 'Sourcegraph', provider: 'greenhouse', slug: 'sourcegraph', website: 'https://sourcegraph.com' },
  { company: 'Docker', provider: 'greenhouse', slug: 'docker', website: 'https://docker.com' },
  { company: 'HashiCorp', provider: 'greenhouse', slug: 'hashicorp', website: 'https://hashicorp.com' },
  { company: 'Vercel', provider: 'greenhouse', slug: 'vercel', website: 'https://vercel.com' },
  { company: 'Datadog', provider: 'greenhouse', slug: 'datadog', website: 'https://datadoghq.com' },

  // Lever
  { company: 'Meesho', provider: 'lever', slug: 'meesho', website: 'https://meesho.io' },
  { company: 'Zeta', provider: 'lever', slug: 'zeta', website: 'https://zeta.tech' },
  { company: 'Pocket FM', provider: 'lever', slug: 'pocketfm', website: 'https://pocketfm.com' },
];

async function run() {
  console.log('Testing expansion candidates...\n');
  const working: any[] = [];

  for (const c of EXPANSION_CANDIDATES) {
    const adapter = getAtsAdapter(c.provider);
    if (!adapter) continue;
    try {
      const res = await adapter.fetchJobs(c.slug, {
        name: c.company,
        websiteUrl: c.website,
        careersUrl: c.website,
      });

      if (res.jobs && res.jobs.length > 0) {
        // Count how many are India or India-eligible remote
        const indiaJobs = res.jobs.filter((j) => isIndiaEligibleJob(j.location, j.description).eligible);
        console.log(`[VERIFIED] ${c.company.padEnd(14)} [${c.provider.padEnd(10)}] -> ${res.jobs.length} total jobs (${indiaJobs.length} India-eligible)`);
        if (indiaJobs.length > 0) {
          working.push({ ...c, total: res.jobs.length, india: indiaJobs.length });
        }
      }
    } catch {}
  }

  console.log('\n======================================================');
  console.log(`HIGH-VALUE EXPANSION SOURCES (${working.length} verified):`);
  console.log('======================================================');
  working.forEach((w) => console.log(`- ${w.company} (${w.provider}): ${w.slug} [${w.india} India-relevant jobs / ${w.total} total]`));
}

run();
