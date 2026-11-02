import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

// Configure isolated test database before importing server/database
const testDbPath = path.resolve(process.cwd(), 'data', 'test_inprocess_suite.db');
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

// Remove old test db files if lingering
[testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

import { app } from './server.ts';
import { closeDatabase, initDatabase } from './server/database.ts';

// Clean helper to invoke express app in-memory
function callApi(method: string, url: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body !== undefined ? JSON.stringify(body) : '';
    const req: any = Readable.from(bodyStr ? [Buffer.from(bodyStr)] : []);
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(bodyStr).toString(),
    };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = { remoteAddress: '127.0.0.1' };

    let resBody = '';
    const res: any = {
      statusCode: 200,
      headers: {},
      setHeader(name: string, value: any) {
        this.headers[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return this.headers[name.toLowerCase()];
      },
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(data: any) {
        resBody = JSON.stringify(data);
        this.end();
      },
      send(data: any) {
        resBody = typeof data === 'object' ? JSON.stringify(data) : String(data);
        this.end();
      },
      end(chunk?: any) {
        if (chunk) resBody += chunk;
        try {
          resolve({ status: this.statusCode, body: JSON.parse(resBody) });
        } catch {
          resolve({ status: this.statusCode, body: resBody });
        }
      },
    };

    (app as any).handle(req, res, (err: any) => {
      if (err) reject(err);
      else resolve({ status: res.statusCode, body: resBody });
    });
  });
}

async function runTestSuite() {
  console.log('=================================================================');
  console.log('>>> STARTING SQLITE PERSISTENCE REGRESSION TEST SUITE (14 TESTS) <<<');
  console.log(`>>> Isolated DB: ${testDbPath}`);
  console.log('=================================================================\n');

  initDatabase(testDbPath);

  // Test 1: Fresh database initializes with empty records
  console.log('Test 1: Fresh database initializes with empty records');
  const candRes = await callApi('GET', '/api/candidate');
  const jobsRes = await callApi('GET', '/api/jobs');
  const appsRes = await callApi('GET', '/api/applications');
  const emailsRes = await callApi('GET', '/api/emails');
  const notifsRes = await callApi('GET', '/api/notifications');
  const connsRes = await callApi('GET', '/api/connectors');

  if (
    candRes.status === 200 &&
    candRes.body.name === '' &&
    jobsRes.body.total === 0 &&
    appsRes.body.length === 0 &&
    emailsRes.body.length === 0 &&
    notifsRes.body.length === 0 &&
    connsRes.body.length === 0
  ) {
    console.log('  -> PASS: Database tables created and clean empty records initialized.\n');
  } else {
    throw new Error('Test 1 Failed: Initial database is not empty!');
  }

  // Test 2: Candidate profile can be created and retrieved
  console.log('Test 2: Candidate profile can be created and retrieved');
  const updateRes = await callApi('PUT', '/api/candidate', {
    name: 'Morgan Rivera',
    email: 'morgan.rivera@example.com',
    headline: 'Senior Full Stack Engineer',
    location: 'Denver, CO',
    skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'],
  });
  const getCandRes = await callApi('GET', '/api/candidate');

  if (
    updateRes.status === 200 &&
    getCandRes.body.name === 'Morgan Rivera' &&
    getCandRes.body.email === 'morgan.rivera@example.com' &&
    getCandRes.body.skills.includes('TypeScript')
  ) {
    console.log('  -> PASS: Candidate profile saved and retrieved from SQLite successfully.\n');
  } else {
    throw new Error('Test 2 Failed: Candidate profile could not be updated or retrieved!');
  }

  // Test 3: Resume upload persists parsed information
  console.log('Test 3: Resume upload persists parsed information and version history');
  const sampleResume = `
MORGAN RIVERA
Senior Full Stack Engineer | Denver, CO | morgan.rivera@example.com
Summary: Accomplished engineer building scalable cloud applications using TypeScript, React, and PostgreSQL.
Skills: TypeScript, React, Node.js, Python, PostgreSQL, Docker, Kubernetes, AWS
Experience:
Senior Software Engineer at Apex Cloud (2022 - Present)
- Engineered distributed microservices with Node.js and TypeScript handling 50k requests per second.
Education:
B.S. in Computer Science, University of Colorado Boulder (2021)
`;
  const uploadRes = await callApi('POST', '/api/candidate/upload-resume', {
    rawText: sampleResume,
    fileName: 'Morgan_Rivera_Resume_2026.pdf',
  });
  const candAfterResume = await callApi('GET', '/api/candidate');

  if (
    uploadRes.status === 200 &&
    candAfterResume.body.resumeVersions.length >= 1 &&
    candAfterResume.body.resumeVersions[0].fileName === 'Morgan_Rivera_Resume_2026.pdf' &&
    candAfterResume.body.rawResumeText.includes('Apex Cloud')
  ) {
    console.log('  -> PASS: Resume upload, parsing, and version tracking persisted in SQLite.\n');
  } else {
    throw new Error('Test 3 Failed: Resume upload failed to persist version or raw text!');
  }

  // Test 4: Job import persists listings
  console.log('Test 4: Job import persists listings');
  const importBatch = [
    {
      title: 'Senior Full-Stack Engineer',
      company: 'Apex Cloud Systems',
      location: 'Denver, CO',
      workArrangement: 'Hybrid',
      employmentType: 'Full-time',
      experienceLevel: 'Senior',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      url: 'https://apexcloud.example.com/jobs/101',
    },
    {
      title: 'DevOps & Infrastructure Architect',
      company: 'Quantis AI',
      location: 'Remote',
      workArrangement: 'Remote',
      employmentType: 'Full-time',
      experienceLevel: 'Lead',
      skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform'],
      url: 'https://quantis.example.com/careers/402',
    },
  ];
  const importRes = await callApi('POST', '/api/jobs/import', {
    items: importBatch,
    format: 'json',
  });
  const jobsAfterImport = await callApi('GET', '/api/jobs');

  if (importRes.body.addedCount === 2 && jobsAfterImport.body.total === 2) {
    console.log('  -> PASS: Imported 2 jobs into SQLite jobs table.\n');
  } else {
    throw new Error('Test 4 Failed: Job import did not persist jobs properly!');
  }

  // Test 5: Duplicate jobs are rejected or correctly deduplicated
  console.log('Test 5: Duplicate jobs are rejected or correctly deduplicated');
  const duplicateImportRes = await callApi('POST', '/api/jobs/import', {
    items: [importBatch[0]],
    format: 'json',
  });
  const jobsAfterDup = await callApi('GET', '/api/jobs');

  if (
    duplicateImportRes.body.addedCount === 0 &&
    duplicateImportRes.body.duplicateCount === 1 &&
    jobsAfterDup.body.total === 2
  ) {
    console.log('  -> PASS: Duplicate job detected, filtered out, catalog size unchanged.\n');
  } else {
    throw new Error('Test 5 Failed: Deduplication logic failed!');
  }

  // Test 6: Job save and dismiss states persist
  console.log('Test 6: Job save and dismiss states persist');
  const testJob = jobsAfterImport.body.jobs[0];
  const saveRes = await callApi('PATCH', `/api/jobs/${testJob.id}/save`);
  const jobAfterSave = await callApi('GET', `/api/jobs/${testJob.id}`);
  const dismissRes = await callApi('PATCH', `/api/jobs/${testJob.id}/dismiss`);
  const jobAfterDismiss = await callApi('GET', `/api/jobs/${testJob.id}`);

  // Re-enable so it can be matched
  await callApi('PATCH', `/api/jobs/${testJob.id}/dismiss`);

  if (saveRes.body.isSaved === true && jobAfterSave.body.isSaved === true && jobAfterDismiss.body.isDismissed === true) {
    console.log('  -> PASS: Job saved and dismissed states successfully toggled and persisted in SQLite.\n');
  } else {
    throw new Error('Test 6 Failed: Save or dismiss states did not persist!');
  }

  // Test 7: Job matching still works
  console.log('Test 7: Job matching still works');
  const matchRes = await callApi('POST', `/api/jobs/${testJob.id}/match`);
  const jobAfterMatch = await callApi('GET', `/api/jobs/${testJob.id}`);

  if (
    matchRes.status === 200 &&
    matchRes.body.overallScore > 0 &&
    jobAfterMatch.body.matchResult?.overallScore === matchRes.body.overallScore
  ) {
    console.log(`  -> PASS: 6D match computed (${matchRes.body.overallScore}%) and saved to database.\n`);
  } else {
    throw new Error('Test 7 Failed: Job match computation or persistence failed!');
  }

  // Test 8: Application creation works
  console.log('Test 8: Application creation works');
  const createRes = await callApi('POST', '/api/applications', {
    jobId: testJob.id,
    notes: 'Submitted initial application on company careers portal.',
  });
  const appsAfterCreate = await callApi('GET', '/api/applications');

  if (
    createRes.status === 200 &&
    createRes.body.company === testJob.company &&
    appsAfterCreate.body.length === 1 &&
    appsAfterCreate.body[0].id === createRes.body.id
  ) {
    console.log(`  -> PASS: Application created (${createRes.body.id}) and linked to job in SQLite.\n`);
  } else {
    throw new Error('Test 8 Failed: Application creation failed!');
  }

  // Test 9: Application stage and notes updates persist
  console.log('Test 9: Application stage and notes updates persist');
  const appId = createRes.body.id;
  const updateAppRes = await callApi('PATCH', `/api/applications/${appId}`, {
    status: 'Interview',
    notes: 'Technical panel interview scheduled for next Thursday 10:00 AM MST',
    submissionConfirmed: true,
  });
  const appsAfterUpdate = await callApi('GET', '/api/applications');
  const updatedAppRecord = appsAfterUpdate.body.find((a: any) => a.id === appId);

  if (
    updateAppRes.status === 200 &&
    updatedAppRecord?.status === 'Interview' &&
    updatedAppRecord?.submissionConfirmed === true &&
    updatedAppRecord?.timeline.length >= 2
  ) {
    console.log('  -> PASS: Application status and timeline updates persisted in SQLite.\n');
  } else {
    throw new Error('Test 9 Failed: Application update did not persist correctly!');
  }

  // Test 10: Email logging and intent classification persist
  console.log('Test 10: Email logging and intent classification persist');
  const emailLogRes = await callApi('POST', '/api/emails/log', {
    from: 'recruiting@apexcloud.example.com',
    subject: 'Invitation to Technical System Design Interview - Apex Cloud Systems',
    fullBody: 'Hi Morgan,\nWe loved your profile and would like to invite you for a 60-minute technical interview next Thursday.\nBest,\nApex Recruiting Team',
    applicationId: appId,
  });
  const emailsList = await callApi('GET', '/api/emails');
  const loggedEmail = emailsList.body.find((e: any) => e.id === emailLogRes.body.id);

  if (
    emailLogRes.status === 200 &&
    loggedEmail &&
    loggedEmail.detectedType === 'interview_invite' &&
    loggedEmail.associatedApplicationId === appId
  ) {
    console.log('  -> PASS: Inbound recruiter message parsed and persisted in SQLite.\n');
  } else {
    throw new Error('Test 10 Failed: Email logging failed!');
  }

  // Test 11: Notifications persist
  console.log('Test 11: Notifications persist');
  const notifsList = await callApi('GET', '/api/notifications');
  if (notifsList.body.length >= 1) {
    const notifId = notifsList.body[0].id;
    const readRes = await callApi('PATCH', `/api/notifications/${notifId}/read`);
    const notifsAfterRead = await callApi('GET', '/api/notifications');
    const readItem = notifsAfterRead.body.find((n: any) => n.id === notifId);

    if (readRes.status === 200 && readItem?.isRead === true) {
      console.log('  -> PASS: System notifications logged, read status updated in SQLite.\n');
    } else {
      throw new Error('Test 11 Failed: Notification read update failed!');
    }
  } else {
    throw new Error('Test 11 Failed: Expected notifications to have been created!');
  }

  // Test 12: JSON and CSV exports contain real database records
  console.log('Test 12: JSON and CSV exports contain real database records');
  const exportJsonRes = await callApi('GET', '/api/export?type=json');
  const exportCsvRes = await callApi('GET', '/api/export?type=csv');

  if (
    exportJsonRes.status === 200 &&
    exportJsonRes.body.candidate.name.toLowerCase() === 'morgan rivera' &&
    exportJsonRes.body.jobs.length === 2 &&
    exportJsonRes.body.applications.length === 1 &&
    typeof exportCsvRes.body === 'string' &&
    exportCsvRes.body.includes(testJob.company)
  ) {
    console.log('  -> PASS: Exports generated from live SQLite data in both JSON and CSV.\n');
  } else {
    throw new Error('Test 12 Failed: Database export did not return expected real data!');
  }

  // Test 13: Invalid application references are handled correctly
  console.log('Test 13: Invalid application references are handled correctly');
  const invalidAppRes = await callApi('POST', '/api/applications', {
    jobId: 'nonexistent-job-uuid-12345',
    notes: 'Should fail gracefully',
  });

  if (invalidAppRes.status === 400 && invalidAppRes.body.error) {
    console.log(`  -> PASS: Rejected invalid foreign job reference with HTTP 400 (${invalidAppRes.body.error}).\n`);
  } else {
    throw new Error('Test 13 Failed: Invalid foreign reference did not produce expected error!');
  }

  // Test 14: Database errors do not produce false success responses
  console.log('Test 14: Database errors do not produce false success responses');
  const invalidJobPatch = await callApi('PATCH', '/api/jobs/missing-job-xyz/save');
  const invalidAppPatch = await callApi('PATCH', '/api/applications/missing-app-xyz', { status: 'Offer' });

  if (invalidJobPatch.status === 404 && invalidAppPatch.status === 404) {
    console.log('  -> PASS: Missing records return honest HTTP 404s without phantom success.\n');
  } else {
    throw new Error('Test 14 Failed: Missing records did not return 404!');
  }

  console.log('=================================================================');
  console.log('>>> ALL 14 SQLITE PERSISTENCE REGRESSION TESTS PASSED (100%) <<<');
  console.log('=================================================================\n');

  closeDatabase();
}

runTestSuite()
  .then(() => {
    // Clean up test db files
    [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    });
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test Suite Failure:', err);
    closeDatabase();
    process.exit(1);
  });
