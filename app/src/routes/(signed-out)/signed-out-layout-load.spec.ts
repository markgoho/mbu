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
  The query string of the URL of the sign-in page.
  */
  query?: string;
}

function setup({ restoredUser, query = '' }: SetupOptions = {}) {
  // Firebase restores the stored session asynchronously. Until `authStateReady()`
  // resolves, `currentUser` is empty, as it is after a hard refresh.
  mockAuth.currentUser = undefined;
  mockAuth.authStateReady = () => {
    mockAuth.currentUser = restoredUser;
    return Promise.resolve();
  };

  const loadEvent = {
    url: new URL(`http://localhost:4200/sign-in${query}`),
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

const signedInUser: MockUser = { uid: 'u1', emailVerified: true };

describe('(signed-out) layout load: requireUnauth', () => {
  it('lets a signed-out visitor reach the page', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('redirects a signed-in user to the app home', async () => {
    const { loadEvent } = setup({ restoredUser: signedInUser });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects a signed-in user to returnTo when it is an in-app path', async () => {
    const { loadEvent } = setup({ restoredUser: signedInUser, query: '?returnTo=%2Fsettings' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/settings' });
  });

  it('redirects a signed-in user to the app home when returnTo is a different site', async () => {
    const { loadEvent } = setup({ restoredUser: signedInUser, query: '?returnTo=//evil.com' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });
});
