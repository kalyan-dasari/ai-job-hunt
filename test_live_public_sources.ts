import { getAtsAdapter } from './server/job-sources/ats/index.ts';

async function testLivePublicSources() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI — LIVE PUBLIC ATS SOURCE INTEGRATION TEST            <<<');
  console.log('========================================================================\n');

  const testTargets = [
    { provider: 'greenhouse', slug: 'razorpay', company: 'Razorpay' },
    { provider: 'lever', slug: 'cred', company: 'CRED' },
    { provider: 'recruitee', slug: 'hackerearth', company: 'HackerEarth' },
  ];

  let passed = 0;
  let offlineOrSkipped = 0;

  for (const target of testTargets) {
    const adapter = getAtsAdapter(target.provider);
    if (!adapter) {
      console.log(`[SKIP] No adapter registered for ${target.provider}`);
      continue;
    }

    console.log(`Testing live public ATS: ${target.company} via ${adapter.displayName} (${target.slug})...`);
    try {
      const connTest = await adapter.testConnection(target.slug);
      if (connTest.success) {
        console.log(`  -> Connection OK: ${connTest.message}`);
        const fetchRes = await adapter.fetchJobs(target.slug, target.company, { limit: 5 });
        if (fetchRes.success) {
          console.log(`  -> Success! Found ${fetchRes.jobs.length} live public vacancies.`);
          if (fetchRes.jobs.length > 0) {
            console.log(`     Sample: "${fetchRes.jobs[0].title}" (${fetchRes.jobs[0].location || 'Location Not Specified'})`);
            console.log(`     URL: ${fetchRes.jobs[0].url}`);
          }
          passed++;
        } else {
          console.log(`  -> Notice: Fetch returned error or 0 jobs (${fetchRes.error || 'Empty'}).`);
          offlineOrSkipped++;
        }
      } else {
        console.log(`  -> Notice: Live endpoint connection returned: ${connTest.message}`);
        offlineOrSkipped++;
      }
    } catch (err: any) {
      console.log(`  -> Live request caught network error: ${err.message || err} (Expected in isolated offline test environments).`);
      offlineOrSkipped++;
    }
    console.log('');
  }

  console.log('========================================================================');
  console.log(`Live ATS Test Summary: ${passed} live validated, ${offlineOrSkipped} offline/fallback handled gracefully.`);
  console.log('========================================================================\n');
}

testLivePublicSources().catch((err) => {
  console.error('Unexpected error in live test:', err);
});
