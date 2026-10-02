import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { UniversityListResponse } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import { load } from './+page.js';

const { listMine } = vi.hoisted(() => ({
  listMine: vi.fn<() => Promise<UniversityListResponse>>(),
}));

vi.mock('#lib/universities.js', () => ({ listMine }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const universityList: UniversityListResponse = {
  universities: [
    {
      id: 'uni1',
      title: 'Spring MBU',
      status: 'draft',
      startDate: '2026-06-01T12:00:00.000Z',
      endDate: null,
      classCount: 2,
    },
  ],
};

interface SetupOptions {
  /**
  The path and the query of the dashboard URL.
  */
  path?: string;
  /**
  The error that the list request rejects with. The default is a request that succeeds.
  */
  listError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ path = '/universities', listError, parentRedirectsTo }: SetupOptions = {}) {
  listMine.mockReset();
  listMine.mockImplementation(() =>
    listError ? Promise.reject(listError) : Promise.resolve(universityList),
  );

  return {
    url: new URL(path, 'http://localhost:4200'),
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('universities dashboard load', () => {
  it('gives the universities of the signed-in user and no denied message', async () => {
    await expect(load(setup())).resolves.toEqual({
      universities: universityList.universities,
      deniedMessage: undefined,
    });
  });

  it('gives the denied message of a university that the user does not own', async () => {
    await expect(load(setup({ path: '/universities?denied=university' }))).resolves.toMatchObject({
      deniedMessage: 'You do not have access to that university.',
    });
  });

  it('gives the denied message of rosters that the user cannot see', async () => {
    await expect(load(setup({ path: '/universities?denied=roster' }))).resolves.toMatchObject({
      deniedMessage: 'You do not have access to those rosters.',
    });
  });

  it('gives no denied message for a value that it does not know', async () => {
    await expect(load(setup({ path: '/universities?denied=other' }))).resolves.toMatchObject({
      deniedMessage: undefined,
    });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({ listError: new ApiError(401, { error: 'Unauthorized' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const loadEvent = setup({ listError: new ApiError(500, { error: 'Database is down' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Database is down' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const loadEvent = setup({ listError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load your universities.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
    expect(listMine).not.toHaveBeenCalled();
  });
});
