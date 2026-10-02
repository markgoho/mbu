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
}

function setup({ restoredUser }: SetupOptions = {}) {
  // Firebase restores the stored session asynchronously. Until `authStateReady()`
  // resolves, `currentUser` is empty, as it is after a hard refresh.
  mockAuth.currentUser = undefined;
  mockAuth.authStateReady = () => {
    mockAuth.currentUser = restoredUser;
    return Promise.resolve();
  };

  const loadEvent = {} as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

describe('(authed) layout load: requireAuth', () => {
  it('redirects a signed-out visitor to sign-in', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('lets a signed-in user through, also when the session is restored late (hard refresh)', async () => {
    const { loadEvent } = setup({ restoredUser: { uid: 'u1', emailVerified: false } });

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });
});
