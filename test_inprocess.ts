process.env.NODE_ENV = 'test';
import { app } from './server';
import { Readable } from 'stream';

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

    app.handle(req, res, (err: any) => {
      if (err) reject(err);
      else resolve({ status: res.statusCode, body: resBody });
    });
  });
}

async function run() {
  console.log('=== RUNNING IN-PROCESS PHASE 1 VERIFICATION TESTS ===\n');

  // Test 1: Candidate Profile empty
  console.log('Test 1: GET /api/candidate');
  const cRes = await callApi('GET', '/api/candidate');
  console.log('  Status:', cRes.status);
  console.log('  Candidate Name:', JSON.stringify(cRes.body.name));
  console.log('  Candidate Skills:', cRes.body.skills);
  console.log('  Experience Count:', cRes.body.experience?.length);
  if (cRes.body.name === '' && cRes.body.skills?.length === 0 && cRes.body.experience?.length === 0) {
    console.log('  -> PASS: Real empty candidate profile initialized.\n');
  } else {
    console.error('  -> FAIL: Profile contains unexpected data!\n');
    process.exit(1);
  }

  // Test 2: Jobs empty
  console.log('Test 2: GET /api/jobs');
  const jRes = await callApi('GET', '/api/jobs');
  console.log('  Status:', jRes.status);
  console.log('  Total Jobs:', jRes.body.total);
  console.log('  Jobs Array Length:', jRes.body.jobs?.length);
  if (jRes.body.total === 0 && jRes.body.jobs?.length === 0) {
    console.log('  -> PASS: Initial jobs catalog is 0.\n');
  } else {
    console.error('  -> FAIL: Jobs catalog is not empty!\n');
    process.exit(1);
  }

  // Test 3: Applications empty
  console.log('Test 3: GET /api/applications');
  const aRes = await callApi('GET', '/api/applications');
  console.log('  Status:', aRes.status);
  console.log('  Applications count:', aRes.body.length);
  if (Array.isArray(aRes.body) && aRes.body.length === 0) {
    console.log('  -> PASS: Applications store is 0.\n');
  } else {
    console.error('  -> FAIL: Applications store is not empty!\n');
    process.exit(1);
  }

  // Test 4: Emails empty
  console.log('Test 4: GET /api/emails');
  const eRes = await callApi('GET', '/api/emails');
  console.log('  Status:', eRes.status);
  console.log('  Emails count:', eRes.body.length);
  if (Array.isArray(eRes.body) && eRes.body.length === 0) {
    console.log('  -> PASS: Recruiter emails store is 0.\n');
  } else {
    console.error('  -> FAIL: Emails store is not empty!\n');
    process.exit(1);
  }

  // Test 5: Notifications empty
  console.log('Test 5: GET /api/notifications');
  const nRes = await callApi('GET', '/api/notifications');
  console.log('  Status:', nRes.status);
  console.log('  Notifications count:', nRes.body.length);
  if (Array.isArray(nRes.body) && nRes.body.length === 0) {
    console.log('  -> PASS: Notifications store is 0.\n');
  } else {
    console.error('  -> FAIL: Notifications store is not empty!\n');
    process.exit(1);
  }

  // Test 6: Connectors empty
  console.log('Test 6: GET /api/connectors');
  const connRes = await callApi('GET', '/api/connectors');
  console.log('  Status:', connRes.status);
  console.log('  Connectors count:', connRes.body.length);
  if (Array.isArray(connRes.body) && connRes.body.length === 0) {
    console.log('  -> PASS: Connectors store is 0.\n');
  } else {
    console.error('  -> FAIL: Connectors store is not empty!\n');
    process.exit(1);
  }

  // Test 7: Resume upload & parsing
  console.log('Test 7: POST /api/candidate/upload-resume');
  const testResumeText = `
SARAH JENKINS
Full-Stack Cloud Engineer | Austin, TX | sjenkins@example.com
Summary: Experienced software engineer building scalable web applications in React, TypeScript, Node.js, and AWS.
Skills: TypeScript, React, Node.js, Express, PostgreSQL, AWS, Docker
Experience:
Senior Software Engineer at CloudWorks (2022 - Present)
- Designed and built high-concurrency microservices with Node.js and TypeScript.
Education:
B.S. Computer Engineering, UT Austin (2021)
`;
  const uploadRes = await callApi('POST', '/api/candidate/upload-resume', {
    rawText: testResumeText,
    fileName: 'Sarah_Jenkins_Resume.txt',
  });
  console.log('  Status:', uploadRes.status);
  console.log('  Parsed Name:', uploadRes.body.profile?.name);
  console.log('  Extracted Skills:', uploadRes.body.profile?.skills);
  if (uploadRes.body.success && uploadRes.body.profile?.skills?.length > 0) {
    console.log('  -> PASS: Resume upload and skill extraction working.\n');
  } else {
    console.error('  -> FAIL: Resume upload failed!\n');
    process.exit(1);
  }

  // Test 8: Job Import & Deduplication
  console.log('Test 8: POST /api/jobs/import');
  const importBatch = [
    {
      title: 'Full Stack Engineer',
      company: 'TechFrontier Solutions',
      location: 'Austin, TX',
      workArrangement: 'Hybrid',
      employmentType: 'Full-time',
      experienceLevel: 'Mid',
      skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
      url: 'https://techfrontier.example.com/jobs/401',
    },
    {
      title: 'DevOps Engineer',
      company: 'CloudMatrix Inc',
      location: 'Remote',
      workArrangement: 'Remote',
      employmentType: 'Full-time',
      experienceLevel: 'Senior',
      skills: ['AWS', 'Docker', 'Kubernetes'],
      url: 'https://cloudmatrix.example.com/jobs/402',
    },
  ];

  const impRes1 = await callApi('POST', '/api/jobs/import', {
    items: importBatch,
    format: 'json',
  });
  console.log('  Import 1 Status:', impRes1.status);
  console.log('  Added Count:', impRes1.body.addedCount);
  console.log('  Duplicate Count:', impRes1.body.duplicateCount);
  console.log('  Total Jobs:', impRes1.body.totalJobs);

  // Deduplication test: re-import duplicate
  const impRes2 = await callApi('POST', '/api/jobs/import', {
    items: [importBatch[0]],
    format: 'json',
  });
  console.log('  Import 2 (Duplicate) Added:', impRes2.body.addedCount);
  console.log('  Import 2 (Duplicate) Filtered:', impRes2.body.duplicateCount);

  if (impRes1.body.addedCount === 2 && impRes2.body.duplicateCount === 1) {
    console.log('  -> PASS: Job import and deduplication working.\n');
  } else {
    console.error('  -> FAIL: Job import or deduplication failed!\n');
    process.exit(1);
  }

  // Test 9: Match Calculation on newly imported job
  console.log('Test 9: POST /api/jobs/:id/match');
  const jobsListRes = await callApi('GET', '/api/jobs');
  const jobToMatch = jobsListRes.body.jobs[0];
  console.log('  Matching Job:', jobToMatch.title, 'at', jobToMatch.company);
  const mRes = await callApi('POST', `/api/jobs/${jobToMatch.id}/match`);
  console.log('  Match Status:', mRes.status);
  console.log('  Overall Score:', mRes.body.overallScore);
  console.log('  Matched Skills:', mRes.body.breakdown?.skillsMatch?.matchedSkills);
  if (mRes.body.overallScore > 0) {
    console.log('  -> PASS: Job matching works against newly uploaded candidate profile.\n');
  } else {
    console.error('  -> FAIL: Job matching score invalid!\n');
    process.exit(1);
  }

  // Test 10: Application Creation & Status Update
  console.log('Test 10: POST & PATCH /api/applications');
  const appCreateRes = await callApi('POST', '/api/applications', {
    jobId: jobToMatch.id,
    notes: 'Submitted application on career portal',
  });
  console.log('  Created App ID:', appCreateRes.body.id);
  console.log('  Created App Status:', appCreateRes.body.status);

  const appPatchRes = await callApi('PATCH', `/api/applications/${appCreateRes.body.id}`, {
    status: 'Interview',
    notes: 'Recruiter phone screen scheduled for next Tuesday',
  });
  console.log('  Updated App Status:', appPatchRes.body.status);
  console.log('  Updated App Notes:', appPatchRes.body.notes);

  if (appPatchRes.body.status === 'Interview') {
    console.log('  -> PASS: Application creation and tracking updates working.\n');
  } else {
    console.error('  -> FAIL: Application update failed!\n');
    process.exit(1);
  }

  console.log('====================================================');
  console.log('>>> ALL 10 TESTS EXECUTED AND PASSED SUCCESSFULLY <<<');
  console.log('====================================================');
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
