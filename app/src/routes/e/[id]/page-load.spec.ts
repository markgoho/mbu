import { describe, expect, it, vi } from 'vitest';
import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';
import { sampleEvent } from './publicEventFixture.js';

const { getPublicUniversity } = vi.hoisted(() => ({
  getPublicUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<PublicUniversity>>(),
}));

vi.mock('#lib/universities.js', () => ({ getPublicUniversity }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The error that the event request rejects with. The default is a request that succeeds.
  */
  eventError?: Error;
}

function setup({ eventError }: SetupOptions = {}) {
  getPublicUniversity.mockReset();
  getPublicUniversity.mockImplementation(() =>
    eventError ? Promise.reject(eventError) : Promise.resolve(sampleEvent),
  );

  return {
    loadEvent: { params: { id: 'uni1' } } as unknown as Parameters<typeof load>[0],
  };
}

describe('public event load', () => {
  it('gives the event of the route', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toEqual({ event: sampleEvent });
    expect(getPublicUniversity).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
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
