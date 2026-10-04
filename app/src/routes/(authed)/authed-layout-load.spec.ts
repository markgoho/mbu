import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api.js';
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
}

function setup({ state = { status: 'signed-out' }, stateError }: SetupOptions = {}) {
  resolveAuth.mockReset();
  resolveAuth.mockImplementation(() =>
    stateError ? Promise.reject(stateError) : Promise.resolve(state),
  );
  const loadEvent = {} as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

describe('(authed) layout load: requireAuth', () => {
  it('redirects a signed-out visitor to sign-in', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('gives the state of a signed-in user to the guards below', async () => {
    const state: AuthState = {
      status: 'signed-in',
      session: { uid: 'u1', email: 'pat@example.com', displayName: '', superAdmin: false },
    };
    const { loadEvent } = setup({ state });

    await expect(load(loadEvent)).resolves.toEqual({ auth: state });
  });

  it('lets a user whose email waits for verification through', async () => {
    const state: AuthState = { status: 'unverified', email: 'new@example.com' };
    const { loadEvent } = setup({ state });

    await expect(load(loadEvent)).resolves.toEqual({ auth: state });
  });

  it('shows the error page when the session cannot be read', async () => {
    const { loadEvent } = setup({
      stateError: new ApiError(500, { code: 'INTERNAL', message: 'internal error' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Could not check your sign-in. Please try again.' },
    });
  });

  it('shows a 503 when the API cannot be reached', async () => {
    const { loadEvent } = setup({ stateError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 503 });
  });
});
