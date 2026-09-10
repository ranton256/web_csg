// Runs the unit and golden suite in golden-update mode: every golden test
// writes its current image to test/golden/. Use deliberately, then review the
// image changes before committing (CONSTRAINTS §4).

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Keep in sync with the "test" script in package.json.
const TEST_GLOB = 'test/**/*.test.js';

const result = spawnSync(process.execPath, ['--test', TEST_GLOB], {
  cwd: REPO_ROOT,
  stdio: 'inherit',
  env: { ...process.env, GOLDEN_UPDATE: '1' },
});
process.exit(result.status ?? 1);
