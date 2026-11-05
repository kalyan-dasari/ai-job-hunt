import { getAtsAdapter, getAllAtsAdapters } from './server/job-sources/ats/index.ts';

interface ProbeTarget {
  provider: string;
  slugs: string[];
  company: string;
}

const CANDIDATES: ProbeTarget[] = [
  { provider: 'greenhouse', slugs: ['clevertap', 'hasura', 'postman', 'urbancompany', 'inmobi', 'browserstack', 'github', 'cloudflare'], company: 'Greenhouse' },
  { provider: 'lever', slugs: ['cred', 'moengage', 'hasura', 'netflix'], company: 'Lever' },
  { provider: 'ashby', slugs: ['postman', 'sentry', 'linear', 'airbyte', 'retool', 'ramp'], company: 'Ashby' },
  { provider: 'smartrecruiters', slugs: ['shiprocket', 'clevertap', 'informa', 'visa', 'smartrecruiters', 'bosch'], company: 'SmartRecruiters' },
  { provider: 'workable', slugs: ['browserstack', 'taxfix', 'innoactive', 'bringg', 'workable'], company: 'Workable' },
  { provider: 'recruitee', slugs: ['hackerearth', 'bunq', 'wetransfer', 'recruitee'], company: 'Recruitee' },
  { provider: 'personio', slugs: ['personio', 'finway', 'flaschenpost'], company: 'Personio' },
  { provider: 'breezy', slugs: ['invision', 'vitals', 'polaris', 'breezy'], company: 'Breezy HR' },
  { provider: 'teamtailor', slugs: ['mentimeter', 'kognity', 'tibber', 'hedvig'], company: 'Teamtailor' },
  { provider: 'rippling', slugs: ['replit', 'apollo', 'superhuman'], company: 'Rippling' },
  { provider: 'workday', slugs: ['walmart/Walmart_External_Careers', 'adobe/external_experienced', 'cisco/Cisco_Careers'], company: 'Workday' },
];

async function runProbes() {
  console.log('>>> PROBING ALL 11 ATS PLATFORMS FOR ACTIVE LIVE SLUGS <<<\n');

  for (const candidate of CANDIDATES) {
    const adapter = getAtsAdapter(candidate.provider);
    if (!adapter) {
      console.log(`[NOT REGISTERED] ${candidate.provider}`);
      continue;
    }

    console.log(`--- Testing Provider: ${adapter.displayName} (${candidate.provider}) ---`);
    let found = false;

    for (const slug of candidate.slugs) {
      const probeUrl = adapter.buildPublicUrl(slug);
      try {
        const testRes = await adapter.testConnection(slug);
        if (testRes.success) {
          const fetchRes = await adapter.fetchJobs(slug, slug.toUpperCase(), { limit: 5 });
          if (fetchRes.success && fetchRes.jobs.length > 0) {
            console.log(`  [SUCCESS] Slug: "${slug}" -> ${fetchRes.jobs.length} jobs parsed!`);
            console.log(`    Request URL: ${probeUrl}`);
            console.log(`    First Title: "${fetchRes.jobs[0].title}"`);
            console.log(`    Location:    "${fetchRes.jobs[0].location}"`);
            console.log(`    Job URL:     "${fetchRes.jobs[0].url}"`);
            found = true;
            break;
          } else {
            console.log(`  [TEST OK, EMPTY JOBS] Slug: "${slug}" -> ${fetchRes.error || '0 jobs'}`);
          }
        } else {
          console.log(`  [TEST FAILED] Slug: "${slug}" -> ${testRes.message}`);
        }
      } catch (err: any) {
        console.log(`  [EXCEPTION] Slug: "${slug}" -> ${err.message}`);
      }
    }

    if (!found) {
      console.log(`  [SUMMARY] No active public endpoint validated for ${candidate.provider} among tested candidate slugs.`);
    }
    console.log('');
  }
}

runProbes().catch(console.error);
