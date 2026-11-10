import { initDatabase, getDatabase, companySourcesRepository, jobsRepository } from '../server/database.ts';

console.log('Applying Migration 006 and verifying database state...');
initDatabase();

const companies = companySourcesRepository.getAll();
console.log(`Total Company Sources in DB: ${companies.length} (${companies.filter(c => c.status === 'active').length} active)`);

const allJobs = jobsRepository.getAllJobs();
console.log(`Total Jobs in DB: ${allJobs.length}`);

const fresherJobs = allJobs.filter(j => j.fresherStatus === 'Fresher');
const experiencedJobs = allJobs.filter(j => j.fresherStatus === 'Experienced');
const unclearJobs = allJobs.filter(j => j.fresherStatus === 'Unclear');

console.log(`Fresher-Friendly: ${fresherJobs.length}`);
console.log(`Experienced:      ${experiencedJobs.length}`);
console.log(`Unclear:          ${unclearJobs.length}`);
console.log(`SUM:              ${fresherJobs.length + experiencedJobs.length + unclearJobs.length}`);
console.log(`Reconciled:       ${fresherJobs.length + experiencedJobs.length + unclearJobs.length === allJobs.length}`);

