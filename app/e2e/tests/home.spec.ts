import { expect, test } from '../fixtures/auth.fixture';

test('signed-in verified user lands on home with stubbed API', async ({
  verifiedPage,
}) => {
  await expect(
    verifiedPage.getByRole('heading', {
      name: 'Merit Badge University Platform',
    }),
  ).toBeVisible();
  await expect(verifiedPage.getByText('ok')).toBeVisible();
});
