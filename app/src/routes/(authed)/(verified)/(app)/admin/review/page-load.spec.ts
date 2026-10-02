import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { ReviewQueueResponse } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import { load } from './+page.js';
import { sampleRow } from './reviewQueueFixture.js';

const { getReviewQueue } = vi.hoisted(() => ({
  getReviewQueue: vi.fn<() => Promise<ReviewQueueResponse>>(),
}));

vi.mock('#lib/universities.js', () => ({ getReviewQueue }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const reviewQueue: ReviewQueueResponse = { universities: [sampleRow] };

interface SetupOptions {
  /**
  The error that the queue request rejects with. The default is a request that succeeds.
  */
  queueError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ queueError, parentRedirectsTo }: SetupOptions = {}) {
  getReviewQueue.mockReset();
  getReviewQueue.mockImplementation(() =>
    queueError ? Promise.reject(queueError) : Promise.resolve(reviewQueue),
  );

  return {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('review queue load', () => {
  it('gives the universities that wait for review', async () => {
    await expect(load(setup())).resolves.toEqual({ universities: reviewQueue.universities });
  });

  it('redirects to the app home when the API answers 403 (the claim was removed)', async () => {
    const loadEvent = setup({ queueError: new ApiError(403, { error: 'Forbidden' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({ queueError: new ApiError(401, { error: 'Unauthorized' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const loadEvent = setup({ queueError: new ApiError(500, { error: 'Database is down' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Database is down' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const loadEvent = setup({ queueError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load the review queue.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
    expect(getReviewQueue).not.toHaveBeenCalled();
  });
});
