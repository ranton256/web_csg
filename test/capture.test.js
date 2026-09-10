import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../tools/serve.mjs';

const CAPTURE = path.join(REPO_ROOT, 'tools', 'capture.mjs');
const PROGRESS_DIR = path.join(REPO_ROOT, 'docs', 'progress');

const listProgress = () => (fs.existsSync(PROGRESS_DIR) ? fs.readdirSync(PROGRESS_DIR).sort() : null);

for (const args of [[], ['../escape']]) {
  test(`capture ${JSON.stringify(args)} prints usage, fails, and writes nothing`, () => {
    const before = listProgress();
    const result = spawnSync(process.execPath, [CAPTURE, ...args], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Usage: npm run capture -- <milestone>/);
    assert.deepEqual(listProgress(), before);
  });
}
