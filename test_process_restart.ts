import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const testDbPath = path.resolve(process.cwd(), 'data', 'test_restart_lifecycle.db');

// Ensure clean slate before test
[testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
});

console.log('======================================================================');
console.log('>>> CRITICAL PERSISTENCE TEST: SEPARATE OPERATING SYSTEM PROCESSES <<<');
console.log(`>>> Database target: ${testDbPath}`);
console.log('======================================================================\n');

// 1. Run Worker Process 1 (Write data and exit)
console.log('--- STEP 1: Launching Process 1 (Writer Worker) ---');
const proc1 = spawnSync('npx', ['tsx', 'test_restart_writer.ts'], {
  shell: true,
  env: {
    ...process.env,
    DATABASE_PATH: testDbPath,
    NODE_ENV: 'test',
  },
  encoding: 'utf-8',
});

console.log(proc1.stdout);
if (proc1.stderr) console.error(proc1.stderr);

if (proc1.status !== 0) {
  console.error(`Process 1 failed with exit code: ${proc1.status}`);
  process.exit(1);
}
console.log('--- Process 1 exited cleanly. Server runtime was terminated. ---\n');

// Verify that database file exists on disk
if (!fs.existsSync(testDbPath)) {
  console.error(`FAIL: Database file ${testDbPath} does not exist on disk after Process 1 exited!`);
  process.exit(1);
}
const dbStat = fs.statSync(testDbPath);
console.log(`Database file confirmed on disk (${dbStat.size} bytes).\n`);

// 2. Run Worker Process 2 (Read data in brand new process)
console.log('--- STEP 2: Launching Process 2 (Verifier Worker in New Process) ---');
const proc2 = spawnSync('npx', ['tsx', 'test_restart_verifier.ts'], {
  shell: true,
  env: {
    ...process.env,
    DATABASE_PATH: testDbPath,
    NODE_ENV: 'test',
  },
  encoding: 'utf-8',
});

console.log(proc2.stdout);
if (proc2.stderr) console.error(proc2.stderr);

if (proc2.status !== 0) {
  console.error(`Process 2 failed with exit code: ${proc2.status}`);
  process.exit(1);
}

// 3. Clean up test database
[testDbPath, `${testDbPath}-wal`, `${testDbPath}-shm`].forEach((p) => {
  if (fs.existsSync(p)) {
    try {
      fs.unlinkSync(p);
    } catch {}
  }
});

console.log('======================================================================');
console.log('>>> CRITICAL PERSISTENCE TEST COMPLETED SUCCESSFULLY (100% PASS)  <<<');
console.log('======================================================================\n');
process.exit(0);

