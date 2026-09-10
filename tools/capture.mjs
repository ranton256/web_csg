// Saves milestone evidence screenshots of the running app.
//
// Usage: npm run capture -- <milestone>     e.g. npm run capture -- M0
// Writes docs/progress/<milestone>/<shot>.png using Chromium at 1280×800,
// device scale factor 1.

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, startServer } from './serve.mjs';

// Later milestones add shots (e.g. one per built-in example).
const SHOTS = [{ name: 'app', path: '/' }];
const VIEWPORT = { width: 1280, height: 800 };

const milestone = process.argv[2];
// Must start with a letter or digit, so flags like --help are never taken as a name.
if (!milestone || !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(milestone)) {
  console.error('Usage: npm run capture -- <milestone>   (starts with a letter or digit; then letters, digits, "-" or "_"; e.g. M0)');
  process.exit(2);
}

// Imported only after the argument check, so usage errors need no browser.
const { chromium } = await import('@playwright/test');

const outputDir = path.join(REPO_ROOT, 'docs', 'progress', milestone);
const server = await startServer({ port: 0 });
const baseURL = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  fs.mkdirSync(outputDir, { recursive: true });
  for (const shot of SHOTS) {
    await page.goto(baseURL + shot.path, { waitUntil: 'load' });
    const file = path.join(outputDir, `${shot.name}.png`);
    await page.screenshot({ path: file });
    console.log(`Wrote ${path.relative(REPO_ROOT, file)}`);
  }
} finally {
  await browser.close();
  server.close();
}
