import { expect, test } from './fixtures/auth.fixture.js';

test('signed-in verified user lands on home with stubbed API', async ({ verifiedPage: page }) => {
  await expect(
    page.getByRole('heading', { name: 'Merit Badge University Platform' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage Universities' })).toBeVisible();

  // The health read does not block the page: the status shows when the API answers.
  await expect(page.getByRole('status')).toHaveText('ok');
});
