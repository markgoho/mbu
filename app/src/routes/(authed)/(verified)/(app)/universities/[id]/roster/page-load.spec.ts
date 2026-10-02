import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { RosterResponse } from '#lib/api-types/registrations-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';
import { sampleRoster } from './rosterFixture.js';

const { getRoster } = vi.hoisted(() => ({
  getRoster: vi.fn<(fetcher: Fetcher, universityId: string) => Promise<RosterResponse>>(),
}));

vi.mock('#lib/registrations.js', () => ({ getRoster }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The error that the roster request rejects with. The default is a request that succeeds.
  */
  rosterError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ rosterError, parentRedirectsTo }: SetupOptions = {}) {
  getRoster.mockReset();
  getRoster.mockImplementation(() =>
    rosterError ? Promise.reject(rosterError) : Promise.resolve(sampleRoster),
  );

  return {
    params: { id: 'uni1' },
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('roster page load', () => {
  it('gives the rosters of the university of the route', async () => {
    await expect(load(setup())).resolves.toEqual({ roster: sampleRoster });
    expect(getRoster).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
  });

  it('redirects to the dashboard with the denied flag when access is forbidden', async () => {
    const loadEvent = setup({ rosterError: new ApiError(403, { error: 'Forbidden' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 303,
      location: '/universities?denied=roster',
    });
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({ rosterError: new ApiError(401, { error: 'Unauthorized' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API for a different API error', async () => {
    const loadEvent = setup({ rosterError: new ApiError(404, { error: 'University not found' }) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 404,
      body: { message: 'University not found' },
    });
  });

  it('shows its fallback message on a load failure with no API message', async () => {
    const loadEvent = setup({ rosterError: new ApiError(500, undefined) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: 'Could not load rosters for this event.' },
    });
  });

  it('shows the error page when the API cannot be reached', async () => {
    const loadEvent = setup({ rosterError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: 'Could not load rosters for this event.' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
    expect(getRoster).not.toHaveBeenCalled();
  });
});
