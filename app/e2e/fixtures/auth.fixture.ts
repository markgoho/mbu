import { test as base, type Page } from '@playwright/test';

/**
 * Auth-emulator fixtures for smoke e2e. Follows the doula-cooperative pattern:
 * real auth against the Auth emulator, but ALL /api/* responses are stubbed via
 * page.route() — no Functions/Firestore emulator involved.
 */
const AUTH_HOST = 'http://127.0.0.1:9099';
const KEY = 'fake-api-key';
const PASSWORD = 'password123';

interface AuthFixtures {
  /** Unique email per test so reruns don't collide in the emulator. */
  verifiedEmail: string;
  /** A page already signed in as a verified user, sitting on the home route. */
  verifiedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  // eslint-disable-next-line no-empty-pattern -- Playwright requires the fixtures arg
  verifiedEmail: async ({}, use, testInfo) => {
    await use(`e2e-${testInfo.testId}-${testInfo.repeatEachIndex}@example.com`);
  },

  verifiedPage: async ({ page, request, verifiedEmail }, use) => {
    // Create the account, then flip emailVerified via the emulator admin API
    // ("Bearer owner" is the emulator's privileged token).
    const signUp = await request.post(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
      { data: { email: verifiedEmail, password: PASSWORD, returnSecureToken: true } },
    );
    const { localId } = (await signUp.json()) as { localId: string };
    await request.post(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update`,
      {
        headers: { authorization: 'Bearer owner' },
        data: { localId, emailVerified: true },
      },
    );

    // Stub the backend BEFORE navigating so the guard chain's bootstrap call
    // resolves without a real API. needsConsent:false lets home render.
    await page.route('**/api/users/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            uid: localId,
            displayName: 'E2E Parent',
            email: verifiedEmail,
            phone: null,
            acceptedTermsAt: '2026-01-01T00:00:00.000Z',
            acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
          },
          needsConsent: false,
        }),
      }),
    );
    await page.route('**/api/health', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      }),
    );

    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(verifiedEmail);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('http://localhost:4200/');

    await use(page);
  },
});

export { expect } from '@playwright/test';
