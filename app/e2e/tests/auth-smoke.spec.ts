import { expect, test } from '@playwright/test';

test('unauthenticated visit to a protected route redirects to sign-in', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('email/password sign-up routes to the verify-email gate', async ({
  page,
}) => {
  const email = `e2e-signup-${Date.now()}@example.com`;

  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Need an account? Sign up' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up' }).click();

  // Unverified accounts are gated: the guard chain redirects to /verify-email.
  await expect(page).toHaveURL(/\/verify-email$/);
});
