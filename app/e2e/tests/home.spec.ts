import { expect, test } from '@playwright/test';

test('home page boots and shows API health status', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    });
  });

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Merit Badge University Platform' }),
  ).toBeVisible();
  await expect(page.getByText('ok')).toBeVisible();
});
