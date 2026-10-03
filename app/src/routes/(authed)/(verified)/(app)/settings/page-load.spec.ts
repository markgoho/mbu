import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { ScoutListResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import { load } from './+page.js';

const { listScouts } = vi.hoisted(() => ({
  listScouts: vi.fn<() => Promise<ScoutListResponse>>(),
}));

vi.mock('#lib/scouts.js', () => ({ listScouts }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const scoutList: ScoutListResponse = {
  scouts: [
    {
      scoutId: 'scout1',
      firstName: 'Alex',
      lastName: 'Smith',
      unit: null,
      council: null,
      district: null,
      ageBand: null,
      bsaId: null,
      accommodations: null,
    },
  ],
};

interface SetupOptions {
  /**
  The error that the scouts request rejects with. The default is a request that succeeds.
  */
  listError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ listError, parentRedirectsTo }: SetupOptions = {}) {
  listScouts.mockReset();
  listScouts.mockImplementation(() =>
    listError ? Promise.reject(listError) : Promise.resolve(scoutList),
  );

  return {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('settings page load', () => {
  it('gives the scouts of the signed-in user', async () => {
    await expect(load(setup())).resolves.toEqual({ scouts: scoutList.scouts });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({
      listError: new ApiError(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const loadEvent = setup({
      listError: new ApiError(409, { code: 'CONFLICT', message: 'Database is down' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 409,
      body: { message: 'Database is down' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const loadEvent = setup({ listError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load your scouts. Please try again.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
    expect(listScouts).not.toHaveBeenCalled();
  });
});
