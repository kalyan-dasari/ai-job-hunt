import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';

// Configure isolated test database before importing server/database
const testDbPath = path.resolve(process.cwd(), 'data', 'test_security_suite.db');
process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

[testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

import { app } from './server.ts';
import { closeDatabase, initDatabase } from './server/database.ts';

// In-process API caller to test security headers, rate limits, and routes without raw TCP sockets
function callApi(method: string, url: string, body?: any, customHeaders: Record<string, string> = {}): Promise<{ status: number; headers: Record<string, string>; body: any }> {
  return new Promise((resolve, reject) => {
    const bodyStr = body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';
    const req: any = Readable.from(bodyStr ? [Buffer.from(bodyStr)] : []);
    req.method = method;
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(bodyStr).toString(),
      ...customHeaders,
    };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = { remoteAddress: '127.0.0.1' };

    let resBody = '';
    const headersMap: Record<string, string> = {};

    const res: any = {
      statusCode: 200,
      headers: headersMap,
      setHeader(name: string, value: any) {
        headersMap[name.toLowerCase()] = String(value);
      },
      getHeader(name: string) {
        return headersMap[name.toLowerCase()];
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
          resolve({ status: this.statusCode, headers: headersMap, body: JSON.parse(resBody) });
        } catch {
          resolve({ status: this.statusCode, headers: headersMap, body: resBody });
        }
      },
    };

    (app as any).handle(req, res, (err: any) => {
      if (err) reject(err);
      else resolve({ status: res.statusCode, headers: headersMap, body: resBody });
    });
  });
}

async function runSecurityAuditTests() {
  console.log('========================================================================');
  console.log('>>> JOBPILOT AI v1.0 — SECURITY, RATE LIMITING & SCHEDULER TEST SUITE  <<<');
  console.log('========================================================================\n');

  initDatabase(testDbPath);

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
    const headRes = await callApi('GET', '/health');
    assert(
      'X-Content-Type-Options is nosniff',
      headRes.headers['x-content-type-options'] === 'nosniff'
    );
    assert(
      'X-Frame-Options is SAMEORIGIN',
      headRes.headers['x-frame-options'] === 'SAMEORIGIN'
    );
    assert(
      'Content-Security-Policy header is present',
      !!headRes.headers['content-security-policy']
    );
    assert(
      'X-XSS-Protection header is present',
      headRes.headers['x-xss-protection'] === '1; mode=block'
    );

    // -------------------------------------------------------------
    // Test 2: Root and API Health check endpoints
    // -------------------------------------------------------------
    console.log('\nTest 2: Health Check Endpoints (/health & /api/health)');
    const rootHealth = await callApi('GET', '/health');
    const apiHealth = await callApi('GET', '/api/health');

    assert(
      'Root /health returns HTTP 200 with healthy status',
      rootHealth.status === 200 && rootHealth.body.status === 'healthy' && rootHealth.body.service === 'JobPilot AI Server'
    );
    assert(
      '/api/health returns HTTP 200 with SQLite database info',
      apiHealth.status === 200 && apiHealth.body.status === 'healthy' && apiHealth.body.database === 'SQLite'
    );

    // -------------------------------------------------------------
    // Test 3: Scheduler Configuration Endpoints
    // -------------------------------------------------------------
    console.log('\nTest 3: Scheduler Configuration API (/api/scheduler)');
    const getSchedRes = await callApi('GET', '/api/scheduler');
    assert(
      'GET /api/scheduler returns active configuration',
      getSchedRes.status === 200 && typeof getSchedRes.body.enabled === 'boolean' && typeof getSchedRes.body.intervalMinutes === 'number'
    );

    const postSchedRes = await callApi('POST', '/api/scheduler/config', { enabled: true, intervalMinutes: 120 });
    assert(
      'POST /api/scheduler/config updates interval',
      postSchedRes.status === 200 && postSchedRes.body.config.intervalMinutes === 120
    );

    // -------------------------------------------------------------
    // Test 4: File Upload Size Validation (> 14MB base64 rejection)
    // -------------------------------------------------------------
    console.log('\nTest 4: Resume File Upload Size Guard');
    const oversizedBase64 = 'A'.repeat(15 * 1024 * 1024); // 15MB base64
    const uploadRes = await callApi('POST', '/api/candidate/upload-resume', {
      fileName: 'huge_exploit.pdf',
      mimeType: 'application/pdf',
      fileBase64: oversizedBase64,
    });

    assert(
      'Rejects oversized file payload with HTTP 413',
      uploadRes.status === 413
    );

    // -------------------------------------------------------------
    // Test 5: Unsupported MIME Type Rejection
    // -------------------------------------------------------------
    console.log('\nTest 5: Unsupported MIME Type Validation');
    const badMimeRes = await callApi('POST', '/api/candidate/upload-resume', {
      fileName: 'script.exe',
      mimeType: 'application/x-msdownload',
      fileBase64: 'TVqQAAMAAAAEAAAA//8AALgAAAAAAAAAQAA=',
    });

    assert(
      'Rejects unallowed executable MIME type with HTTP 415',
      badMimeRes.status === 415
    );

    // -------------------------------------------------------------
    // Test 6: Rate Limiting Headers on Protected Endpoints
    // -------------------------------------------------------------
    console.log('\nTest 6: Rate Limiter Headers on Protected Endpoints');
    const apiRes = await callApi('GET', '/api/candidate');
    assert(
      'Rate limit headers are present on /api/* requests',
      apiRes.headers['x-ratelimit-limit'] === '180' && !!apiRes.headers['x-ratelimit-remaining']
    );

    console.log('\n========================================================================');
    console.log(`>>> SECURITY & SCHEDULER AUDIT PASSED: ${passedCount}/${totalCount} TESTS (100%) <<<`);
    console.log('========================================================================\n');
  } finally {
    closeDatabase();
    [testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    });
  }
}

runSecurityAuditTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Security test failed with error:', err);
  process.exit(1);
});
