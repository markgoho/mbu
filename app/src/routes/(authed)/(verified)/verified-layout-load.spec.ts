import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { load } from './+layout.js';

interface MockUser {
  uid: string;
  emailVerified: boolean;
}

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    currentUser: undefined as MockUser | undefined,
    authStateReady: () => Promise.resolve(),
  },
}));

vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => mockAuth }));

interface SetupOptions {
  /**
  The user that Firebase restores from the stored session. `undefined` means signed out.
  */
  restoredUser?: MockUser | undefined;
  /**
  The `(authed)` guard above this one redirects to this path. The default is that it lets the user through.
  */
  parentRedirectsTo?: string;
}

function setup({
  restoredUser = { uid: 'u1', emailVerified: true },
  parentRedirectsTo,
}: SetupOptions = {}) {
  // Firebase restores the stored session asynchronously. Until `authStateReady()`
  // resolves, `currentUser` is empty, as it is after a hard refresh.
  mockAuth.currentUser = undefined;
  mockAuth.authStateReady = () => {
    mockAuth.currentUser = restoredUser;
    return Promise.resolve();
  };

  const loadEvent = {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

describe('(verified) layout load: requireVerified', () => {
  it('lets a user with a verified email through', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('redirects a user with an email that is not verified to verify-email', async () => {
    const { loadEvent } = setup({ restoredUser: { uid: 'u1', emailVerified: false } });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 303,
      location: '/verify-email',
    });
  });

  it('gives the redirect of the guard above it, not its own', async () => {
    const { loadEvent } = setup({
      restoredUser: { uid: 'u1', emailVerified: false },
      parentRedirectsTo: '/sign-in',
    });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });
});
