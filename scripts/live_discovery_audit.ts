import { initDatabase, companySourcesRepository, jobsRepository } from '../server/database.ts';
import { careerPageCrawler } from '../server/job-sources/discovery/crawler.ts';
import { RawSourceJob } from '../server/job-sources/types.ts';

async function runLiveDiscoveryAudit() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI v1.0 — LIVE JOB DISCOVERY & SOURCE AUDIT PASS        <<<');
  console.log('========================================================================\n');

  initDatabase('data/jobpilot.db');
  const companies = companySourcesRepository.getAll();

  console.log(`Configured company sources: ${companies.length}\n`);

  let successfullyFetched = 0;
  let temporarilyUnavailable = 0;
  let zeroVacancies = 0;
  let rawJobsFetched = 0;

  const fetchedRawJobs: RawSourceJob[] = [];
  const sourceResults: Array<{ name: string; ats: string; status: string; count: number; note: string }> = [];

  for (const comp of companies) {
    process.stdout.write(`Fetching ${comp.name.padEnd(20)} [${(comp.atsProvider || 'web').padEnd(14)}] ... `);
    try {
      const crawlRes = await careerPageCrawler.crawlCompany(comp);
      if (crawlRes.success) {
        if (crawlRes.jobs.length > 0) {
          successfullyFetched++;
          rawJobsFetched += crawlRes.jobs.length;
          fetchedRawJobs.push(...crawlRes.jobs);
          sourceResults.push({ name: comp.name, ats: comp.atsProvider || 'web', status: 'SUCCESS', count: crawlRes.jobs.length, note: 'Vacancies retrieved' });
          console.log(`OK (${crawlRes.jobs.length} jobs)`);
        } else {
          zeroVacancies++;
          sourceResults.push({ name: comp.name, ats: comp.atsProvider || 'web', status: 'ZERO_VACANCIES', count: 0, note: 'Active source, 0 open positions' });
          console.log(`ZERO VACANCIES`);
        }
      } else {
        temporarilyUnavailable++;
        sourceResults.push({ name: comp.name, ats: comp.atsProvider || 'web', status: 'UNAVAILABLE', count: 0, note: crawlRes.error || 'Fetch failed' });
        console.log(`UNAVAILABLE (${crawlRes.error || 'Connection failed'})`);
      }
    } catch (err: any) {
      temporarilyUnavailable++;
      sourceResults.push({ name: comp.name, ats: comp.atsProvider || 'web', status: 'ERROR', count: 0, note: err.message || 'Exception' });
      console.log(`ERROR (${err.message})`);
    }
  }

  // Database Catalog Stats
  const existingJobs = jobsRepository.getAllJobs();
  const fresherJobs = existingJobs.filter((j) => j.fresherStatus === 'Fresher');
  const experiencedJobs = existingJobs.filter((j) => j.fresherStatus === 'Experienced');
  const unclearJobs = existingJobs.filter((j) => j.fresherStatus === 'Unclear');
  const indiaJobs = existingJobs.filter((j) => j.country === 'India' || (j.locationCategory && !j.locationCategory.includes('international')));

  // Application URL validation audit
  let validUrlCount = 0;
  let missingOrInvalidUrlCount = 0;
  for (const job of existingJobs) {
    const url = job.applicationUrl || job.originalUrl;
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      validUrlCount++;
    } else {
      missingOrInvalidUrlCount++;
    }
  }

  console.log('\n========================================================================');
  console.log('>>> LIVE DISCOVERY AUDIT SUMMARY REPORT                              <<<');
  console.log('========================================================================');
  console.log(`- Configured Company Sources:       ${companies.length}`);
  console.log(`- Successfully Fetched Sources:     ${successfullyFetched}`);
  console.log(`- Temporarily Unavailable Sources:  ${temporarilyUnavailable}`);
  console.log(`- Sources with Zero Vacancies:      ${zeroVacancies}`);
  console.log(`- Raw Jobs Fetched in this pass:    ${rawJobsFetched}`);
  console.log(`- Total Unique Jobs in SQLite:      ${existingJobs.length}`);
  console.log(`- Fresher-Friendly Jobs (0-2 yrs):  ${fresherJobs.length}`);
  console.log(`- Experienced Jobs (3+ yrs):        ${experiencedJobs.length}`);
  console.log(`- Unclear Experience Jobs:          ${unclearJobs.length}`);
  console.log(`- India-Relevant Jobs in Catalog:   ${indiaJobs.length}`);
  console.log(`- Valid Application URLs:           ${validUrlCount}/${existingJobs.length} (${((validUrlCount/existingJobs.length)*100).toFixed(1)}%)`);
  console.log(`- Missing / Invalid URLs:           ${missingOrInvalidUrlCount}`);
  console.log('========================================================================\n');
}

runLiveDiscoveryAudit().catch((err) => {
  console.error('Fatal error during live discovery audit:', err);
  process.exit(1);
});

