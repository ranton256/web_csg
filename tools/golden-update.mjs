// Runs the unit and golden suite in golden-update mode: every golden test
// writes its current image to its golden file. Use deliberately, then review
// the image changes before committing (CONSTRAINTS §4).
//
// Usage: npm run golden:update [-- <test file or glob> ...]   (default: all tests)

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Keep in sync with the "test" script in package.json.
const TEST_GLOB = 'test/**/*.test.js';

const patterns = process.argv.length > 2 ? process.argv.slice(2) : [TEST_GLOB];
const result = spawnSync(process.execPath, ['--test', ...patterns], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: { ...process.env, GOLDEN_UPDATE: '1' },
});
process.exit(result.status ?? 1);
