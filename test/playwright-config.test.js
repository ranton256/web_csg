import assert from 'node:assert/strict';
import { test } from 'node:test';
import config from '../playwright.config.js';

test('Playwright output stays out of test-results/golden/', () => {
  // Playwright empties outputDir at the start of every run.
  assert.equal(config.outputDir, 'test-results/playwright');
});

test('e2e runs in Chromium, Firefox, and WebKit without retries', () => {
  assert.deepEqual(config.projects.map((project) => project.name), ['chromium', 'firefox', 'webkit']);
  assert.equal(config.retries, 0);
});
