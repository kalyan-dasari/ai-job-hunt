import { getAllAtsAdapters, getAtsAdapter } from '../server/job-sources/ats/index.ts';

interface CandidateProbe {
  company: string;
  provider: string;
  slug: string;
  website: string;
  careersUrl: string;
}

const CANDIDATES: CandidateProbe[] = [
  // Lever candidates
  { company: 'Postman', provider: 'lever', slug: 'postman', website: 'https://postman.com', careersUrl: 'https://jobs.lever.co/postman' },
  { company: 'Hasura', provider: 'lever', slug: 'hasura', website: 'https://hasura.io', careersUrl: 'https://jobs.lever.co/hasura' },
  { company: 'CleverTap', provider: 'lever', slug: 'clevertap', website: 'https://clevertap.com', careersUrl: 'https://jobs.lever.co/clevertap' },
  { company: 'Khatabook', provider: 'lever', slug: 'khatabook', website: 'https://khatabook.com', careersUrl: 'https://jobs.lever.co/khatabook' },
  { company: 'Groww', provider: 'lever', slug: 'Groww', website: 'https://groww.in', careersUrl: 'https://jobs.lever.co/Groww' },
  { company: 'HackerEarth', provider: 'lever', slug: 'hackerearth', website: 'https://hackerearth.com', careersUrl: 'https://jobs.lever.co/hackerearth' },
  { company: 'Urban Company', provider: 'lever', slug: 'urbancompany', website: 'https://urbancompany.com', careersUrl: 'https://jobs.lever.co/urbancompany' },
  { company: 'Zepto', provider: 'lever', slug: 'zepto', website: 'https://zeptonow.com', careersUrl: 'https://jobs.lever.co/zepto' },
  { company: 'BrowserStack', provider: 'lever', slug: 'browserstack', website: 'https://browserstack.com', careersUrl: 'https://jobs.lever.co/browserstack' },
  { company: 'Meesho', provider: 'lever', slug: 'meesho', website: 'https://meesho.io', careersUrl: 'https://jobs.lever.co/meesho' },
  { company: 'Zeta', provider: 'lever', slug: 'zeta', website: 'https://zeta.tech', careersUrl: 'https://jobs.lever.co/zeta' },
  { company: 'Juspay', provider: 'lever', slug: 'juspay', website: 'https://juspay.in', careersUrl: 'https://jobs.lever.co/juspay' },

  // Greenhouse candidates
  { company: 'Meesho', provider: 'greenhouse', slug: 'meesho', website: 'https://meesho.io', careersUrl: 'https://boards.greenhouse.io/meesho' },
  { company: 'PhonePe', provider: 'greenhouse', slug: 'phonepe', website: 'https://phonepe.com', careersUrl: 'https://boards.greenhouse.io/phonepe' },
  { company: 'Postman', provider: 'greenhouse', slug: 'postmaninc', website: 'https://postman.com', careersUrl: 'https://boards.greenhouse.io/postmaninc' },
  { company: 'Urban Company', provider: 'greenhouse', slug: 'urbancompany', website: 'https://urbancompany.com', careersUrl: 'https://boards.greenhouse.io/urbancompany' },
  { company: 'BrowserStack', provider: 'greenhouse', slug: 'browserstackjobs', website: 'https://browserstack.com', careersUrl: 'https://boards.greenhouse.io/browserstackjobs' },
  { company: 'Zepto', provider: 'greenhouse', slug: 'zeptoindia', website: 'https://zeptonow.com', careersUrl: 'https://boards.greenhouse.io/zeptoindia' },
  { company: 'MoEngage', provider: 'greenhouse', slug: 'moengageinc', website: 'https://moengage.com', careersUrl: 'https://boards.greenhouse.io/moengageinc' },
  { company: 'Licious', provider: 'greenhouse', slug: 'licious', website: 'https://licious.in', careersUrl: 'https://boards.greenhouse.io/licious' },
  { company: 'Moglix', provider: 'greenhouse', slug: 'moglix', website: 'https://moglix.com', careersUrl: 'https://boards.greenhouse.io/moglix' },
  { company: 'Darwinbox', provider: 'greenhouse', slug: 'darwinbox', website: 'https://darwinbox.com', careersUrl: 'https://boards.greenhouse.io/darwinbox' },
  { company: 'Classplus', provider: 'greenhouse', slug: 'classplus', website: 'https://classplus.co', careersUrl: 'https://boards.greenhouse.io/classplus' },

  // Ashby candidates
  { company: 'Zepto', provider: 'ashby', slug: 'zepto', website: 'https://zeptonow.com', careersUrl: 'https://jobs.ashbyhq.com/zepto' },
  { company: 'Urban Company', provider: 'ashby', slug: 'urban-company', website: 'https://urbancompany.com', careersUrl: 'https://jobs.ashbyhq.com/urban-company' },
  { company: 'Hasura', provider: 'ashby', slug: 'hasura-io', website: 'https://hasura.io', careersUrl: 'https://jobs.ashbyhq.com/hasura-io' },
  { company: 'OneCode', provider: 'ashby', slug: 'onecode', website: 'https://onecode.in', careersUrl: 'https://jobs.ashbyhq.com/onecode' },
  { company: 'Kula', provider: 'ashby', slug: 'kula', website: 'https://kula.ai', careersUrl: 'https://jobs.ashbyhq.com/kula' },

  // Workable candidates
  { company: 'Juspay', provider: 'workable', slug: 'juspay', website: 'https://juspay.in', careersUrl: 'https://apply.workable.com/juspay/' },
  { company: 'BrowserStack', provider: 'workable', slug: 'browserstack', website: 'https://browserstack.com', careersUrl: 'https://apply.workable.com/browserstack/' },
  { company: 'InVideo', provider: 'workable', slug: 'invideo', website: 'https://invideo.io', careersUrl: 'https://apply.workable.com/invideo/' },
  { company: 'Turing', provider: 'workable', slug: 'turing', website: 'https://turing.com', careersUrl: 'https://apply.workable.com/turing/' },
  { company: 'SpringRole', provider: 'workable', slug: 'springrole', website: 'https://springrole.com', careersUrl: 'https://apply.workable.com/springrole/' },

  // SmartRecruiters candidates
  { company: 'Darwinbox', provider: 'smartrecruiters', slug: 'Darwinbox', website: 'https://darwinbox.com', careersUrl: 'https://careers.smartrecruiters.com/Darwinbox' },
  { company: 'LeadSquared', provider: 'smartrecruiters', slug: 'LeadSquared', website: 'https://leadsquared.com', careersUrl: 'https://careers.smartrecruiters.com/LeadSquared' },
  { company: 'Delhivery', provider: 'smartrecruiters', slug: 'Delhivery', website: 'https://delhivery.com', careersUrl: 'https://careers.smartrecruiters.com/Delhivery' },
  { company: 'Ola', provider: 'smartrecruiters', slug: 'OlaCabs', website: 'https://olacabs.com', careersUrl: 'https://careers.smartrecruiters.com/OlaCabs' },

  // Recruitee candidates
  { company: 'HackerEarth', provider: 'recruitee', slug: 'hackerearth-jobs', website: 'https://hackerearth.com', careersUrl: 'https://hackerearth-jobs.recruitee.com/' },
];

async function probe() {
  console.log(`Starting probe of ${CANDIDATES.length} candidate ATS sources...\n`);
  const successful: Array<CandidateProbe & { jobsCount: number }> = [];

  for (const c of CANDIDATES) {
    const adapter = getAtsAdapter(c.provider);
    if (!adapter) {
      console.log(`[SKIP] No adapter for provider ${c.provider}`);
      continue;
    }

    try {
      const res = await adapter.fetchJobs(c.slug, {
        name: c.company,
        websiteUrl: c.website,
        careersUrl: c.careersUrl,
      });

      if (res.jobs && res.jobs.length > 0) {
        console.log(`[SUCCESS] ${c.company.padEnd(16)} [${c.provider.padEnd(14)}] slug: ${c.slug.padEnd(20)} -> ${res.jobs.length} jobs!`);
        successful.push({ ...c, jobsCount: res.jobs.length });
      } else {
        console.log(`[EMPTY]   ${c.company.padEnd(16)} [${c.provider.padEnd(14)}] slug: ${c.slug.padEnd(20)} -> 0 jobs`);
      }
    } catch (err: any) {
      console.log(`[FAIL]    ${c.company.padEnd(16)} [${c.provider.padEnd(14)}] slug: ${c.slug.padEnd(20)} -> ${err.message}`);
    }
  }

  console.log('\n======================================================');
  console.log(`PROBE SUMMARY: ${successful.length} VERIFIED WORKING SOURCES FOUND`);
  console.log('======================================================');
  successful.forEach((s) => {
    console.log(`- ${s.company} (${s.provider}): ${s.slug} -> ${s.jobsCount} live jobs`);
  });
}

probe().catch((err) => console.error('Probe failed:', err));
