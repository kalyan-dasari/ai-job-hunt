import { initDatabase, companySourcesRepository, jobsRepository } from '../server/database.ts';
import { careerPageCrawler } from '../server/job-sources/discovery/crawler.ts';
import { RawSourceJob } from '../server/job-sources/types.ts';
import { isIndiaEligibleJob, normalizeRawJob, classifyDetailedLocation } from '../server/job-sources/normalizer.ts';
import { deduplicator } from '../server/job-sources/deduplicator.ts';

async function reconcile() {
  initDatabase('data/jobpilot.db');
  const existingJobs = jobsRepository.getAllJobs();
  const existingKeys = new Set(
    existingJobs.map((j) => `${j.company.toLowerCase().replace(/[^a-z0-9]/g, '')}::${j.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`)
  );
  const existingUrls = new Set(existingJobs.map((j) => j.canonicalUrl || j.originalUrl));

  console.log('Fetching live raw jobs from 18 active companies...');
  const companies = companySourcesRepository.getAll();
  const rawJobs: RawSourceJob[] = [];

  for (const comp of companies) {
    try {
      const res = await careerPageCrawler.crawlCompany(comp);
      if (res.success && res.jobs.length > 0) {
        rawJobs.push(...res.jobs);
      }
    } catch {}
  }

  console.log(`Total Raw Jobs Fetched: ${rawJobs.length}`);

  // Reconcile each raw job
  let alreadyInDbCount = 0;
  let batchDuplicateCount = 0;
  let filteredNonIndiaCount = 0;
  let rejectedOtherCount = 0;
  let newValidJobCount = 0;

  const rejectionReasons: Record<string, number> = {};
  const seenBatchKeys = new Set<string>();

  for (const raw of rawJobs) {
    const key = `${raw.company.toLowerCase().replace(/[^a-z0-9]/g, '')}::${raw.title.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const url = raw.url || '';

    // Check if duplicate within batch
    if (seenBatchKeys.has(key)) {
      batchDuplicateCount++;
      rejectionReasons['Batch duplicate (same company & title in fetched stream)'] = (rejectionReasons['Batch duplicate (same company & title in fetched stream)'] || 0) + 1;
      continue;
    }
    seenBatchKeys.add(key);

    // Check location eligibility (India-relevance)
    const locCheck = classifyDetailedLocation(raw.location, raw.workArrangement, raw.country, raw.description);
    const isStrictIndia = locCheck.category !== 'International location' && locCheck.category !== 'Unknown';

    if (!isStrictIndia) {
      filteredNonIndiaCount++;
      const reason = `Non-India International Location: ${raw.location || 'Foreign'}`;
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
      continue;
    }

    // Check if already in SQLite DB
    if (existingKeys.has(key) || existingUrls.has(url)) {
      alreadyInDbCount++;
      continue;
    }

    // Otherwise it's a new job that was discovered in this live pass
    newValidJobCount++;
  }

  console.log('\n========================================================================');
  console.log('>>> RAW JOBS RECONCILIATION SUMMARY (SUM = RAW TOTAL)                <<<');
  console.log('========================================================================');
  console.log(`Total Raw Jobs Fetched:             ${rawJobs.length}`);
  console.log(`1. Already Persisted in SQLite DB:  ${alreadyInDbCount}`);
  console.log(`2. Filtered Out (Non-India Loc.):   ${filteredNonIndiaCount}`);
  console.log(`3. Batch Duplicates Filtered:       ${batchDuplicateCount}`);
  console.log(`4. Unsaved Live Incremental Jobs:   ${newValidJobCount}`);
  const totalReconciled = alreadyInDbCount + filteredNonIndiaCount + batchDuplicateCount + newValidJobCount;
  console.log(`Reconciled Total:                   ${totalReconciled} / ${rawJobs.length}`);
  console.log('========================================================================\n');

  console.log('Top Rejection/Filter Reasons Breakdown:');
  const sortedReasons = Object.entries(rejectionReasons).sort((a, b) => b[1] - a[1]);
  for (const [r, count] of sortedReasons.slice(0, 15)) {
    console.log(`  - [${count} jobs] ${r}`);
  }
}

reconcile().catch(console.error);
