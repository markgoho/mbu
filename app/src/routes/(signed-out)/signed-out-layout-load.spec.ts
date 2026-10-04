import { describe, expect, it, vi } from 'vitest';
import type { AuthState } from '#lib/auth.js';
import { load } from './+layout.js';

const { resolveAuth } = vi.hoisted(() => ({
  resolveAuth: vi.fn<(fetcher: unknown) => Promise<AuthState>>(),
}));

vi.mock('#lib/auth.js', () => ({ resolveAuth }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({}));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The state of the visitor. The default is signed out.
  */
  state?: AuthState;
  /**
  The error that the read of the session rejects with.
  */
  stateError?: Error;
  /**
  The query string of the URL of the sign-in page.
  */
  query?: string;
}

function setup({ state = { status: 'signed-out' }, stateError, query = '' }: SetupOptions = {}) {
  resolveAuth.mockReset();
  resolveAuth.mockImplementation(() =>
    stateError ? Promise.reject(stateError) : Promise.resolve(state),
  );
  vi.spyOn(console, 'error').mockReturnValue();

  const loadEvent = {
    url: new URL(`http://localhost:4200/sign-in${query}`),
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

const signedIn: AuthState = {
  status: 'signed-in',
  session: { uid: 'u1', email: 'pat@example.com', displayName: '', superAdmin: false },
};

describe('(signed-out) layout load: requireUnauth', () => {
  it('lets a signed-out visitor reach the page', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('shows the page when the session cannot be read', async () => {
    const { loadEvent } = setup({ stateError: new Error('offline') });

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('redirects a signed-in user to the app home', async () => {
    const { loadEvent } = setup({ state: signedIn });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects a user whose email waits for verification, so the guards send it on', async () => {
    const { loadEvent } = setup({ state: { status: 'unverified', email: 'new@example.com' } });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects a signed-in user to returnTo when it is an in-app path', async () => {
    const { loadEvent } = setup({ state: signedIn, query: '?returnTo=%2Fsettings' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/settings' });
  });

  it('redirects a signed-in user to the app home when returnTo is a different site', async () => {
    const { loadEvent } = setup({ state: signedIn, query: '?returnTo=//evil.com' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });
});
