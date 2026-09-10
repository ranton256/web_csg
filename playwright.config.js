import { defineConfig, devices } from '@playwright/test';

// Dedicated port so e2e runs never collide with `npm start` on 8080.
const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  // Playwright empties its output directory on every run; keep it away from
  // test-results/golden/, where golden mismatches leave images for review.
  outputDir: 'test-results/playwright',
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `node tools/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: true,
  },
});
