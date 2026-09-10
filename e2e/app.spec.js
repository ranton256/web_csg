import { expect, test } from '@playwright/test';

test('app page loads without errors', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));

  await page.goto('/');

  await expect(page).toHaveTitle('Web CSG');
  // Set by the page's module script, so this also proves ES modules load.
  await expect(page.locator('body')).toHaveAttribute('data-module-loaded', 'true');
  expect(errors).toEqual([]);
});
