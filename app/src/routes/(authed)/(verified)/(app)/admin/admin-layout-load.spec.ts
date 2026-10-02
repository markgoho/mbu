import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { load } from './+layout.js';

interface MockUser {
  uid: string;
}

const { mockAuth, getIdTokenResult } = vi.hoisted(() => ({
  mockAuth: {
    currentUser: undefined as MockUser | undefined,
    authStateReady: () => Promise.resolve(),
  },
  getIdTokenResult: vi.fn<(user: unknown) => Promise<{ claims: Record<string, unknown> }>>(),
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));
vi.mock('firebase/auth', () => ({ getIdTokenResult }));

interface SetupOptions {
  /**
  The custom claims of the ID token of the signed-in user.
  */
  claims?: Record<string, unknown>;
  /**
  The error that the token call rejects with. The default is a call that succeeds.
  */
  tokenError?: Error;
  /**
  The `(app)` guard above this one redirects to this path. The default is that it lets the user through.
  */
  parentRedirectsTo?: string;
}

function setup({
  claims = { superAdmin: true },
  tokenError,
  parentRedirectsTo,
}: SetupOptions = {}) {
  vi.restoreAllMocks();
  const consoleError = vi.spyOn(console, 'error').mockReturnValue();

  // Firebase restores the stored session asynchronously. Until `authStateReady()`
  // resolves, `currentUser` is empty, as it is after a hard refresh.
  mockAuth.currentUser = undefined;
  mockAuth.authStateReady = () => {
    mockAuth.currentUser = { uid: 'u1' };
    return Promise.resolve();
  };
  getIdTokenResult.mockReset();
  getIdTokenResult.mockImplementation(() =>
    tokenError ? Promise.reject(tokenError) : Promise.resolve({ claims }),
  );

  const loadEvent = {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent, consoleError };
}

describe('admin layout load: requireSuperAdmin', () => {
  it('lets a super-admin through', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('redirects a user with no super-admin claim to the app home', async () => {
    const { loadEvent } = setup({ claims: {} });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects a user with a claim that is not exactly `true` to the app home', async () => {
    const { loadEvent } = setup({ claims: { superAdmin: 'true' } });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects to the app home and logs the error when the token call fails', async () => {
    const { loadEvent, consoleError } = setup({ tokenError: new Error('network') });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
    expect(consoleError).toHaveBeenCalled();
  });

  it('gives the redirect of the guard above it, not its own', async () => {
    const { loadEvent } = setup({ claims: {}, parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
  });
});
