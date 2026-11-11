import { initDatabase, schedulerRepository, jobsRepository, companySourcesRepository } from '../server/database.ts';

async function main() {
  console.log('Initializing database...');
  initDatabase();
  console.log('Database initialized successfully.');

  const sched = schedulerRepository.getState();
  console.log('Scheduler state:', JSON.stringify(sched, null, 2));

  const total = jobsRepository.getAllJobs().length;
  console.log(`Total jobs in DB: ${total}`);

  const sample = jobsRepository.getAllJobs()[0];
  console.log('Sample job temporal fields:', {
    id: sample.id,
    title: sample.title,
    company: sample.company,
    postedAt: sample.postedAt,
    firstSeenAt: sample.firstSeenAt,
    lastSeenAt: sample.lastSeenAt,
    jobStatus: sample.jobStatus,
    isUpdated: sample.isUpdated,
    sourceId: sample.sourceId,
    externalJobId: sample.externalJobId,
  });

  const daily = jobsRepository.getDailyDiscoveries('today');
  console.log('Daily Discoveries stats:', daily.stats);
  console.log('Filtered jobs returned count:', daily.jobs.length);

  const comps = companySourcesRepository.getAll();
  console.log(`Total company sources: ${comps.length}, Sample: ${comps[0].name}, isEnabled: ${comps[0].isEnabled}`);
}

main().catch(err => {
  console.error('Migration test error:', err);
  process.exit(1);
});
