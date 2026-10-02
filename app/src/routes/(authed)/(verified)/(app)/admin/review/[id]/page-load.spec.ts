import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { UniversityDetailResponse } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';
import { sampleDetail } from './reviewFixture.js';

const { getUniversity } = vi.hoisted(() => ({
  getUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<UniversityDetailResponse>>(),
}));

vi.mock('#lib/universities.js', () => ({ getUniversity }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The error that the university request rejects with. The default is a request that succeeds.
  */
  detailError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ detailError, parentRedirectsTo }: SetupOptions = {}) {
  getUniversity.mockReset();
  getUniversity.mockImplementation(() =>
    detailError ? Promise.reject(detailError) : Promise.resolve(sampleDetail),
  );

  return {
    params: { id: 'uni1' },
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('review detail load', () => {
  it('gives the university of the route and its classes', async () => {
    await expect(load(setup())).resolves.toEqual({
      university: sampleDetail.university,
      classes: sampleDetail.classes,
    });
    expect(getUniversity).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
  });

  it('redirects to the app home when the API answers 403 (the claim was removed)', async () => {
    const loadEvent = setup({ detailError: new ApiError(403, { error: 'Forbidden' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({ detailError: new ApiError(401, { error: 'Unauthorized' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const loadEvent = setup({ detailError: new ApiError(404, { error: 'University not found' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 404,
      body: { message: 'University not found' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const loadEvent = setup({ detailError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load this university.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
    expect(getUniversity).not.toHaveBeenCalled();
  });
});
