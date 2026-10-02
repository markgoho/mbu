import { expect, test } from './fixtures/auth.fixture.js';

test('unauthenticated visit to a protected route redirects to sign-in', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
});

test('email/password sign-up routes to the verify-email gate', async ({ page }, testInfo) => {
  const email = `e2e-signup-${testInfo.repeatEachIndex}-${testInfo.retry}-${Date.now()}@example.com`;

  await page.goto('/sign-in');
  await page.getByRole('button', { name: 'Need an account? Sign up' }).click();
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

  // The email of a new account is not verified: the guards send the user to /verify-email.
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
