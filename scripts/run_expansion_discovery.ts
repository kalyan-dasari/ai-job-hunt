import { initDatabase, companySourcesRepository, jobsRepository, candidateRepository } from '../server/database.ts';
import { jobDiscoveryAgent } from '../server/job-sources/agent.ts';
import { calculateDeterministicMatch } from '../server/matching.ts';

async function main() {
  console.log('--- Initializing SQLite database and running migrations ---');
  initDatabase();

  const allCompanies = companySourcesRepository.getAll();
  console.log(`Total configured company sources in SQLite: ${allCompanies.length}`);

  const activeCompanies = allCompanies.filter((c) => (c.isEnabled ?? true) && c.status === 'active');
  console.log(`Active enabled company sources: ${activeCompanies.length}`);

  const expansionIds = [
    'comp-meesho',
    'comp-zeta',
    'comp-pocketfm',
    'comp-supabase',
    'comp-gitlab',
    'comp-elastic',
    'comp-datadog',
    'comp-thoughtworks',
  ];

  console.log('\n--- Running live discovery across expansion sources ---');
  const startTime = Date.now();
  const { run } = await jobDiscoveryAgent.discover({ companyIds: expansionIds });
  const durationSec = Math.round((Date.now() - startTime) / 1000);

  console.log(`\nDiscovery pass completed in ${durationSec}s:`);
  console.log(`  Raw jobs discovered: ${run.jobsFound}`);
  console.log(`  New unique openings added: ${run.jobsAdded}`);
  console.log(`  Duplicates filtered / updated: ${run.duplicatesFiltered}`);
  console.log(`  Errors: ${run.errors.length > 0 ? run.errors.join('; ') : 'None'}`);

  const allJobs = jobsRepository.getAllJobs();
  console.log(`\n======================================================`);
  console.log(`TOTAL UNIQUE STORED JOBS IN SQLITE: ${allJobs.length}`);
  console.log(`======================================================`);

  // Audit metrics
  let fresherCount = 0;
  let experiencedCount = 0;
  let unclearCount = 0;
  let remoteIndiaCount = 0;
  let indiaCityCount = 0;

  for (const j of allJobs) {
    if (j.fresherStatus === 'Fresher') fresherCount++;
    else if (j.fresherStatus === 'Experienced') experiencedCount++;
    else unclearCount++;

    if (j.locationCategory === 'India remote' || j.locationCategory === 'International remote explicitly open to India') {
      remoteIndiaCount++;
    } else if (j.locationCategory === 'India city') {
      indiaCityCount++;
    }
  }

  console.log(`Fresher-friendly: ${fresherCount}`);
  console.log(`Experienced: ${experiencedCount}`);
  console.log(`Unclear: ${unclearCount}`);
  console.log(`Sum: ${fresherCount + experiencedCount + unclearCount} (Matches total: ${fresherCount + experiencedCount + unclearCount === allJobs.length})`);
  console.log(`Remote India / Intl open to India: ${remoteIndiaCount}`);
  console.log(`India city domestic: ${indiaCityCount}`);

  // Test personalized candidate profile and matching
  console.log('\n--- Verifying Candidate Profile & Personalized Ranking ---');
  const profile = candidateRepository.getProfile();
  console.log('Current Candidate Profile:');
  console.log(`  Name: ${profile.name || '(not set)'}`);
  console.log(`  Skills: ${profile.skills.slice(0, 5).join(', ')} (${profile.skills.length} total)`);
  console.log(`  Preferred Roles: ${profile.preferredRoles.join(', ')}`);
  console.log(`  Preferred Locations: ${profile.preferredLocations.join(', ')}`);
  console.log(`  Experience: ${profile.minExperienceYears ?? 0}–${profile.maxExperienceYears ?? 2} yrs`);

  // Update with sample preferences to verify recalculation
  const testUpdated = candidateRepository.updateProfile({
    preferredRoles: ['Python Developer', 'Full Stack Developer', 'Software Engineer'],
    preferredLocations: ['Bengaluru', 'Hyderabad', 'Remote India'],
    minExperienceYears: 0,
    maxExperienceYears: 2,
  });

  jobsRepository.recalculateAllMatches(testUpdated, calculateDeterministicMatch);
  const reEvaluatedJobs = jobsRepository.getAllJobs();
  const topMatches = reEvaluatedJobs
    .filter((j) => !j.isDismissed)
    .sort((a, b) => (b.matchResult?.overallScore || 0) - (a.matchResult?.overallScore || 0))
    .slice(0, 5);

  console.log('\nTop 5 Personalized Matches:');
  for (const m of topMatches) {
    console.log(`  - [${m.matchResult?.overallScore}%] ${m.title} at ${m.company} (${m.location})`);
    console.log(`    Explanation: ${m.matchResult?.explanation}`);
    console.log(`    Matching skills: ${(m.matchResult?.strongMatches || []).join(', ')}`);
  }
}

main().catch((err) => {
  console.error('Fatal error during expansion discovery:', err);
  process.exit(1);
});

