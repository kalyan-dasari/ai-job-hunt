import { getAtsAdapter, getAllAtsAdapters } from './server/job-sources/ats/index.ts';

export interface VerifiedLiveResult {
  provider: string;
  displayName: string;
  companyName: string;
  slug: string;
  publicUrl: string;
  httpStatus: number;
  contentType: string;
  rawJobsReturned: number;
  parsedJobsCount: number;
  acceptedJobsCount: number;
  firstTwoJobTitles: [string, string];
  firstTwoJobUrls: [string, string];
  success: boolean;
  notes?: string;
}

export const VERIFIED_LIVE_TARGETS = [
  { provider: 'greenhouse', slug: 'inmobi', company: 'InMobi' },
  { provider: 'lever', slug: 'cred', company: 'CRED' },
  { provider: 'ashby', slug: 'sentry', company: 'Sentry' },
  { provider: 'workable', slug: 'mercari-india', company: 'Mercari India' },
  { provider: 'smartrecruiters', slug: 'smartrecruiters', company: 'SmartRecruiters' },
  { provider: 'recruitee', slug: 'bunq', company: 'bunq' },
  { provider: 'personio', slug: 'finway', company: 'finway' },
  { provider: 'breezy', slug: 'breezy', company: 'Breezy' },
  { provider: 'teamtailor', slug: 'tibber', company: 'Tibber' },
  { provider: 'rippling', slug: 'decisions', company: 'Decisions' },
  { provider: 'workday', slug: 'adobe.wd5/external_experienced', company: 'Adobe' },
];

export async function runAll11AtsLiveVerification(): Promise<VerifiedLiveResult[]> {
  const results: VerifiedLiveResult[] = [];

  console.log('========================================================================');
  console.log('>>> VERIFYING ALL 11 ATS PLATFORMS LIVE OVER THE INTERNET            <<<');
  console.log('========================================================================\n');

  for (const target of VERIFIED_LIVE_TARGETS) {
    const adapter = getAtsAdapter(target.provider);
    if (!adapter) {
      console.error(`Adapter not found for ${target.provider}`);
      continue;
    }

    const publicUrl = adapter.buildPublicUrl(target.slug);
    console.log(`[TESTING] ${adapter.displayName} (${target.provider}) | Company: ${target.company}`);
    console.log(`  Target Request URL: ${publicUrl}`);

    try {
      // Direct raw fetch to measure exact HTTP status & content type
      const rawRes = await fetch(publicUrl, {
        headers: { 'User-Agent': 'JobPilotBot/1.0', 'Accept': '*/*' },
        method: target.provider === 'workday' ? 'POST' : 'GET',
        body: target.provider === 'workday' ? JSON.stringify({ appliedFacets: {}, limit: 5, offset: 0, searchText: '' }) : undefined,
      });

      const httpStatus = rawRes.status;
      const contentType = rawRes.headers.get('content-type') || 'unknown';

      // Now run adapter's fetchJobs
      const fetchRes = await adapter.fetchJobs(target.slug, target.company, { limit: 10 });

      if (fetchRes.success && fetchRes.jobs.length > 0) {
        const rawJobs = fetchRes.jobs;
        const firstTwoTitles: [string, string] = [
          rawJobs[0]?.title || 'N/A',
          rawJobs[1]?.title || (rawJobs[0]?.title ?? 'N/A'),
        ];
        const firstTwoUrls: [string, string] = [
          rawJobs[0]?.url || 'N/A',
          rawJobs[1]?.url || (rawJobs[0]?.url ?? 'N/A'),
        ];

        console.log(`  -> SUCCESS! HTTP ${httpStatus} (${contentType})`);
        console.log(`  -> Parsed ${rawJobs.length} real jobs.`);
        console.log(`  -> Job 1: "${firstTwoTitles[0]}" (${rawJobs[0].location})`);
        console.log(`     Link:  ${firstTwoUrls[0]}`);
        console.log(`  -> Job 2: "${firstTwoTitles[1]}" (${rawJobs[1]?.location || 'N/A'})`);
        console.log(`     Link:  ${firstTwoUrls[1]}\n`);

        results.push({
          provider: target.provider,
          displayName: adapter.displayName,
          companyName: target.company,
          slug: target.slug,
          publicUrl,
          httpStatus,
          contentType,
          rawJobsReturned: fetchRes.totalFound ?? rawJobs.length,
          parsedJobsCount: rawJobs.length,
          acceptedJobsCount: rawJobs.length,
          firstTwoJobTitles: firstTwoTitles,
          firstTwoJobUrls: firstTwoUrls,
          success: true,
        });
      } else {
        console.log(`  -> FAIL / EMPTY: HTTP ${httpStatus}. Error: ${fetchRes.error || '0 jobs parsed'}\n`);
        results.push({
          provider: target.provider,
          displayName: adapter.displayName,
          companyName: target.company,
          slug: target.slug,
          publicUrl,
          httpStatus,
          contentType,
          rawJobsReturned: 0,
          parsedJobsCount: 0,
          acceptedJobsCount: 0,
          firstTwoJobTitles: ['N/A', 'N/A'],
          firstTwoJobUrls: ['N/A', 'N/A'],
          success: false,
          notes: fetchRes.error,
        });
      }
    } catch (err: any) {
      console.log(`  -> EXCEPTION: ${err.message}\n`);
      results.push({
        provider: target.provider,
        displayName: adapter.displayName,
        companyName: target.company,
        slug: target.slug,
        publicUrl,
        httpStatus: 0,
        contentType: 'error',
        rawJobsReturned: 0,
        parsedJobsCount: 0,
        acceptedJobsCount: 0,
        firstTwoJobTitles: ['N/A', 'N/A'],
        firstTwoJobUrls: ['N/A', 'N/A'],
        success: false,
        notes: err.message,
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  console.log('========================================================================');
  console.log(`>>> ATS LIVE VERIFICATION COMPLETE: ${successCount} / ${results.length} PASSED`);
  console.log('========================================================================\n');

  return results;
}

if (process.argv[1]?.includes('test_verify_live_adapters')) {
  runAll11AtsLiveVerification().catch(console.error);
}
