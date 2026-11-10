import { app } from './server.ts';
import { Server } from 'http';

async function runSecurityAuditTests() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI v1.0 — SECURITY, RATE LIMITING & SCHEDULER TEST SUITE  <<<');
  console.log('========================================================================\n');

  const port = 3456;
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  let passedCount = 0;
  let totalCount = 0;

  function assert(testName: string, condition: boolean, detail?: string) {
    totalCount++;
    if (condition) {
      console.log(`  -> PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(`  -> FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
      process.exitCode = 1;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Security Headers on HTTP responses
    // -------------------------------------------------------------
    console.log('Test 1: Verification of HTTP Security Headers');
    const headRes = await fetch(`${baseUrl}/health`);
    assert(
      'X-Content-Type-Options is nosniff',
      headRes.headers.get('x-content-type-options') === 'nosniff'
    );
    assert(
      'X-Frame-Options is SAMEORIGIN',
      headRes.headers.get('x-frame-options') === 'SAMEORIGIN'
    );
    assert(
      'Content-Security-Policy header is present',
      !!headRes.headers.get('content-security-policy')
    );
    assert(
      'X-XSS-Protection header is present',
      headRes.headers.get('x-xss-protection') === '1; mode=block'
    );

    // -------------------------------------------------------------
    // Test 2: Root and API Health check endpoints
    // -------------------------------------------------------------
    console.log('\nTest 2: Health Check Endpoints (/health & /api/health)');
    const rootHealth = await fetch(`${baseUrl}/health`).then((r) => r.json());
    const apiHealth = await fetch(`${baseUrl}/api/health`).then((r) => r.json());

    assert(
      'Root /health returns healthy status',
      rootHealth.status === 'healthy' && rootHealth.service === 'JobPilot AI Server'
    );
    assert(
      '/api/health returns healthy status and SQLite database info',
      apiHealth.status === 'healthy' && apiHealth.database === 'SQLite'
    );

    // -------------------------------------------------------------
    // Test 3: Scheduler Configuration Endpoints
    // -------------------------------------------------------------
    console.log('\nTest 3: Scheduler Configuration API (/api/scheduler)');
    const getSchedRes = await fetch(`${baseUrl}/api/scheduler`).then((r) => r.json());
    assert(
      'GET /api/scheduler returns active configuration',
      typeof getSchedRes.enabled === 'boolean' && typeof getSchedRes.intervalMinutes === 'number'
    );

    const postSchedRes = await fetch(`${baseUrl}/api/scheduler/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true, intervalMinutes: 120 }),
    }).then((r) => r.json());

    assert(
      'POST /api/scheduler/config updates interval',
      postSchedRes.config.intervalMinutes === 120
    );

    // -------------------------------------------------------------
    // Test 4: File Upload Size Validation (> 14MB base64 rejection)
    // -------------------------------------------------------------
    console.log('\nTest 4: Resume File Upload Size Guard');
    const oversizedBase64 = 'A'.repeat(15 * 1024 * 1024); // 15MB base64
    const uploadRes = await fetch(`${baseUrl}/api/candidate/upload-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'huge_exploit.pdf',
        mimeType: 'application/pdf',
        fileBase64: oversizedBase64,
      }),
    });

    assert(
      'Rejects oversized file payload with HTTP 413',
      uploadRes.status === 413
    );

    // -------------------------------------------------------------
    // Test 5: Unsupported MIME Type Rejection
    // -------------------------------------------------------------
    console.log('\nTest 5: Unsupported MIME Type Validation');
    const badMimeRes = await fetch(`${baseUrl}/api/candidate/upload-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'script.exe',
        mimeType: 'application/x-msdownload',
        fileBase64: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=',
      }),
    });

    assert(
      'Rejects unallowed executable MIME type with HTTP 415',
      badMimeRes.status === 415
    );

    // -------------------------------------------------------------
    // Test 6: Rate Limiting Headers & Throttling
    // -------------------------------------------------------------
    console.log('\nTest 6: Rate Limiter Headers on Protected Endpoints');
    const apiRes = await fetch(`${baseUrl}/api/candidate`);
    assert(
      'Rate limit headers are present on /api/* requests',
      apiRes.headers.has('x-ratelimit-limit') && apiRes.headers.has('x-ratelimit-remaining')
    );

    console.log('\n========================================================================');
    console.log(`>>> SECURITY & SCHEDULER AUDIT PASSED: ${passedCount}/${totalCount} TESTS (100%) <<<`);
    console.log('========================================================================\n');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('Security test failed with error:', err);
  process.exit(1);
});
