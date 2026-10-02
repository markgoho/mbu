import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import { load } from './+layout.js';

const { mockAuth, bootstrap } = vi.hoisted(() => ({
  mockAuth: { authStateReady: () => Promise.resolve() },
  bootstrap: vi.fn<() => Promise<unknown>>(),
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('#lib/session.svelte.js', () => ({ bootstrap, SESSION_DEPENDENCY: 'app:session' }));

function bootstrapResponse(isConsentNeeded: boolean): BootstrapResponse {
  return {
    user: {
      uid: 'u1',
      displayName: 'Test Parent',
      email: 'parent@example.com',
      phone: '555-0100',
      acceptedTermsAt: '2026-01-01T00:00:00.000Z',
      acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
      acceptedPolicyVersion: '1',
      rosterExportAckAt: '2026-01-02T00:00:00.000Z',
    },
    needsConsent: isConsentNeeded,
  };
}

interface SetupOptions {
  /**
  `true` means that the account has not accepted the terms yet.
  */
  needsConsent?: boolean;
  /**
  The error that the bootstrap call rejects with. The default is a call that succeeds.
  */
  bootstrapError?: Error;
  /**
  The `(verified)` guard above this one redirects to this path. The default is that it lets the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ needsConsent = false, bootstrapError, parentRedirectsTo }: SetupOptions = {}) {
  const session = bootstrapResponse(needsConsent);
  bootstrap.mockReset();
  bootstrap.mockImplementation(() =>
    bootstrapError ? Promise.reject(bootstrapError) : Promise.resolve(session),
  );

  const loadEvent = {
    depends: () => {},
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent, session };
}

describe('(app) layout load: requireOnboarded', () => {
  it('gives the bootstrap response of an onboarded user as the session', async () => {
    const { loadEvent, session } = setup();

    await expect(load(loadEvent)).resolves.toEqual({ session });
  });

  it('redirects to onboarding when the account has not accepted the terms', async () => {
    const { loadEvent } = setup({ needsConsent: true });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const { loadEvent } = setup({ bootstrapError: new ApiError(401, { error: 'Unauthorized' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const { loadEvent } = setup({
      bootstrapError: new ApiError(500, { error: 'Bootstrap failed' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Bootstrap failed' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const { loadEvent } = setup({ bootstrapError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load your account. Please try again.' },
    });
  });

  it('gives the redirect of the guard above it, not its own', async () => {
    const { loadEvent } = setup({ needsConsent: true, parentRedirectsTo: '/verify-email' });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 303,
      location: '/verify-email',
    });
  });
});
