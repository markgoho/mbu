import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type {
  BadgeCatalogResponse,
  UniversityDetailResponse,
} from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';

const { getUniversity, listBadges } = vi.hoisted(() => ({
  getUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<UniversityDetailResponse>>(),
  listBadges: vi.fn<() => Promise<BadgeCatalogResponse>>(),
}));

vi.mock('#lib/universities.js', () => ({ getUniversity, listBadges }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const detail: UniversityDetailResponse = {
  university: {
    id: 'uni1',
    title: 'Spring MBU',
    status: 'draft',
    timezone: 'America/New_York',
    startDate: '2026-06-01T12:00:00.000Z',
    endDate: null,
    registrationOpensAt: null,
    registrationClosesAt: '2026-05-25T23:59:59.000Z',
    location: {
      name: 'Scout Hall',
      address: '1 Main St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    },
    periods: [],
    createdByUid: 'u1',
    reviewNote: null,
    submittedAt: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  },
  classes: [],
};

const catalog: BadgeCatalogResponse = {
  badges: [{ slug: 'camping', title: 'Camping', eagleRequired: true }],
};

interface SetupOptions {
  /**
  The error that the university request rejects with. The default is a request that succeeds.
  */
  detailError?: Error;
  /**
  The error that the badge catalog request rejects with. The default is a request that succeeds.
  */
  badgesError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ detailError, badgesError, parentRedirectsTo }: SetupOptions = {}) {
  getUniversity.mockReset();
  getUniversity.mockImplementation(() =>
    detailError ? Promise.reject(detailError) : Promise.resolve(detail),
  );
  listBadges.mockReset();
  listBadges.mockImplementation(() =>
    badgesError ? Promise.reject(badgesError) : Promise.resolve(catalog),
  );

  return {
    params: { id: 'uni1' },
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('university editor load', () => {
  it('gives the university of the route, its classes and the badge catalog', async () => {
    await expect(load(setup())).resolves.toEqual({
      university: detail.university,
      classes: detail.classes,
      badges: catalog.badges,
    });
    expect(getUniversity).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
  });

  it('redirects to the dashboard with the denied flag on 403', async () => {
    const loadEvent = setup({ detailError: new ApiError(403, { error: 'Forbidden' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 303,
      location: '/universities?denied=university',
    });
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

  it('shows its fallback message for a load failure with no API message', async () => {
    const loadEvent = setup({ detailError: new ApiError(500, undefined) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Could not load this university.' },
    });
  });

  it('shows the error page when the badge catalog request fails', async () => {
    const loadEvent = setup({ badgesError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load this university.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
    expect(getUniversity).not.toHaveBeenCalled();
    expect(listBadges).not.toHaveBeenCalled();
  });
});
