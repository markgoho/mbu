import { expect, test as base, type Page } from '@playwright/test';
import type { HealthResponse } from '../../src/lib/api-types/health-api.types.js';
import type {
  CreateSessionRequest,
  SessionResponse,
} from '../../src/lib/api-types/session-api.types.js';
import type { BootstrapResponse } from '../../src/lib/api-types/users-api.types.js';

/**
 * The fixtures of the smoke suite. Auth is real, against the Firebase Auth
 * emulator. The API is not: the preview server has no `/api` proxy, so each
 * `/api/*` call must have a `page.route()` mock. There is no Functions emulator
 * and no Firestore emulator.
 *
 * The `page` fixture fakes the three session routes of the API (ADR 0007 in
 * `api/docs/adr/`): `POST /api/session` sets the `__session` cookie in the
 * browser, `GET /api/session` answers only a request that carries it, and
 * `DELETE /api/session` clears it. A request to `/api/*` with an
 * `Authorization` header fails the test: the app sends no ID token but the one
 * in the body of the exchange.
 *
 * All specs import `test` from this file, not from `@playwright/test`, so that
 * each test has the guard for calls with no mock.
 */
const AUTH_HOST = 'http://127.0.0.1:9099';
const KEY = 'fake-api-key';
const PASSWORD = 'password123';

interface AuthFixtures {
  /**
  An email address that no other test, retry or run uses, so that the sign-up in the emulator does not collide.
  */
  verifiedEmail: string;
  /**
  A page that is signed in as a verified user who accepted the terms, on the app home.
  */
  verifiedPage: Page;
}

function isApiCall(url: URL): boolean {
  return url.pathname.startsWith('/api/');
}

const SESSION_COOKIE = '__session';

/**
Reads the claims of an ID token of the Auth emulator (an unsigned JWT).
*/
function idTokenClaims(idToken: string): { user_id: string; email?: string; name?: string } {
  const payload = idToken.split('.', 2)[1] ?? '';
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    user_id: string;
    email?: string;
    name?: string;
  };
}

/**
 * Fakes the session routes of the API on `page`. The browser keeps the cookie
 * that `POST /api/session` sets, so the session survives a reload as it does
 * with the real API.
 */
async function fakeSessionRoutes(page: Page): Promise<void> {
  const sessions = new Map<string, SessionResponse>();
  await page.route('**/api/session', async (route) => {
    const request = route.request();
    const headers = await request.allHeaders();
    const cookie = /__session=([^;]+)/.exec(headers['cookie'] ?? '')?.[1];
    const method = request.method();
    if (method === 'POST') {
      const { idToken } = request.postDataJSON() as CreateSessionRequest;
      const claims = idTokenClaims(idToken);
      const token = `e2e-session-${sessions.size + 1}-${Date.now()}`;
      const session: SessionResponse = {
        uid: claims.user_id,
        email: claims.email ?? '',
        displayName: claims.name ?? '',
        superAdmin: false,
      };
      sessions.set(token, session);
      await route.fulfill({
        json: session,
        headers: {
          'Set-Cookie': `${SESSION_COOKIE}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`,
        },
      });
      return;
    }
    if (method === 'DELETE') {
      if (cookie) sessions.delete(cookie);
      await route.fulfill({
        status: 204,
        headers: {
          'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
        },
      });
      return;
    }
    const session = cookie ? sessions.get(cookie) : undefined;
    await (session
      ? route.fulfill({ json: session })
      : route.fulfill({
          status: 401,
          json: { code: 'UNAUTHORIZED', message: 'Missing session cookie' },
        }));
  });
}

export const test = base.extend<AuthFixtures>({
  // The guard for an `/api/*` call with no mock. Playwright uses the route that
  // was added last, so the mocks of a test win over this one, which is the
  // first. A call that comes here is aborted, and the test fails after its body
  // with the list of the calls: an abort alone is not visible, because the app
  // shows a failed read as an error page or as `unavailable`.
  page: async ({ page }, use) => {
    const unmockedCalls: string[] = [];
    await page.route(isApiCall, async (route) => {
      const request = route.request();
      unmockedCalls.push(`${request.method()} ${new URL(request.url()).pathname}`);
      await route.abort();
    });
    await fakeSessionRoutes(page);

    const bearerCalls: string[] = [];
    page.on('request', (request) => {
      if (isApiCall(new URL(request.url())) && request.headers()['authorization'] !== undefined) {
        bearerCalls.push(`${request.method()} ${new URL(request.url()).pathname}`);
      }
    });

    await use(page);

    expect(unmockedCalls, 'Each /api/* call must have a page.route() mock').toEqual([]);
    expect(bearerCalls, 'No /api/* call may carry an Authorization header').toEqual([]);
  },

  // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture names from this parameter.
  verifiedEmail: async ({}, use, testInfo) => {
    await use(
      `e2e-${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}-${Date.now()}@example.com`,
    );
  },

  verifiedPage: async ({ page, request, verifiedEmail }, use) => {
    // Makes the account, then sets `emailVerified` with the admin API of the
    // emulator ("Bearer owner" is the privileged token of the emulator).
    const signUp = await request.post(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${KEY}`,
      { data: { email: verifiedEmail, password: PASSWORD, returnSecureToken: true } },
    );
    expect(signUp.ok(), 'Sign-up in the Auth emulator').toBe(true);
    const { localId } = (await signUp.json()) as { localId: string };
    const update = await request.post(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update`,
      {
        headers: { authorization: 'Bearer owner' },
        data: { localId, emailVerified: true },
      },
    );
    expect(update.ok(), 'Set emailVerified in the Auth emulator').toBe(true);

    // The mocks are in place before the navigation. The `(app)` guard
    // bootstraps the account (`POST /api/users/me`): `needsConsent: false`
    // lets the user into the app. The app home reads the API health.
    const bootstrap: BootstrapResponse = {
      user: {
        uid: localId,
        displayName: 'E2E Parent',
        email: verifiedEmail,
        phone: null,
        acceptedTermsAt: '2026-01-01T00:00:00.000Z',
        acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
        acceptedPolicyVersion: '2026-01-01',
        rosterExportAckAt: null,
      },
      needsConsent: false,
    };
    await page.route('**/api/users/me', (route) =>
      route.request().method() === 'POST' ? route.fulfill({ json: bootstrap }) : route.fallback(),
    );
    const health: HealthResponse = { status: 'ok' };
    await page.route('**/api/health', (route) => route.fulfill({ json: health }));

    await page.goto('/sign-in');
    await page.getByLabel('Email').fill(verifiedEmail);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('/');

    await use(page);
  },
});

export { expect } from '@playwright/test';
