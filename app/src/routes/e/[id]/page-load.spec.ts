import { describe, expect, it, vi } from 'vitest';
import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';
import { sampleEvent } from './publicEventFixture.js';

const { getPublicUniversity, authStateReady } = vi.hoisted(() => ({
  getPublicUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<PublicUniversity>>(),
  authStateReady: vi.fn<() => Promise<void>>(),
}));

vi.mock('#lib/universities.js', () => ({ getPublicUniversity }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({ authStateReady }) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The error that the event request rejects with. The default is a request that succeeds.
  */
  eventError?: Error;
}

function setup({ eventError }: SetupOptions = {}) {
  // The order of the calls: the load must wait for Firebase before the request.
  const calls: string[] = [];
  authStateReady.mockReset();
  authStateReady.mockImplementation(async () => {
    calls.push('authStateReady');
  });
  getPublicUniversity.mockReset();
  getPublicUniversity.mockImplementation(() => {
    calls.push('getPublicUniversity');
    return eventError ? Promise.reject(eventError) : Promise.resolve(sampleEvent);
  });

  return {
    calls,
    loadEvent: { params: { id: 'uni1' } } as unknown as Parameters<typeof load>[0],
  };
}

describe('public event load', () => {
  it('gives the event of the route', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toEqual({ event: sampleEvent });
    expect(getPublicUniversity).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
  });

  it('waits for Firebase to restore a stored session before the request', async () => {
    const { loadEvent, calls } = setup();

    await load(loadEvent);

    expect(calls).toEqual(['authStateReady', 'getPublicUniversity']);
  });

  it('gives the "not found" state when the event is missing or not published', async () => {
    const { loadEvent } = setup({
      eventError: new ApiError(404, { code: 'NOT_FOUND', message: 'Not found' }),
    });

    await expect(load(loadEvent)).resolves.toEqual({ event: undefined, failure: 'not-found' });
  });

  it('gives the "failed" state for a different API error', async () => {
    const { loadEvent } = setup({
      eventError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });

    await expect(load(loadEvent)).resolves.toEqual({ event: undefined, failure: 'failed' });
  });

  it('gives the "failed" state for a network failure', async () => {
    const { loadEvent } = setup({ eventError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).resolves.toEqual({ event: undefined, failure: 'failed' });
  });

  it('does not send the visitor to sign-in when the API refuses the token', async () => {
    const { loadEvent } = setup({
      eventError: new ApiError(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' }),
    });

    await expect(load(loadEvent)).resolves.toEqual({ event: undefined, failure: 'failed' });
  });
});
