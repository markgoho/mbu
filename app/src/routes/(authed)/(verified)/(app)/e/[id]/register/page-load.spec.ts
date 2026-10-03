import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { ScheduleResponse } from '#lib/api-types/registrations-api.types.js';
import type { PublicUniversity } from '#lib/api-types/universities-api.types.js';
import type { ScoutListResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { load } from './+page.js';
import { alexSmith, registrationFor, sampleEvent } from './registerFixture.js';

const { getPublicUniversity, listScouts, getSchedule } = vi.hoisted(() => ({
  getPublicUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<PublicUniversity>>(),
  listScouts: vi.fn<(fetcher: Fetcher) => Promise<ScoutListResponse>>(),
  getSchedule: vi.fn<(fetcher: Fetcher, universityId: string) => Promise<ScheduleResponse>>(),
}));

vi.mock('#lib/universities.js', () => ({ getPublicUniversity }));
vi.mock('#lib/scouts.js', () => ({ listScouts }));
vi.mock('#lib/registrations.js', () => ({ getSchedule }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const FALLBACK_MESSAGE = "We couldn't load this event. Please refresh to try again.";

const registrations = [registrationFor('archery', 'enrolled')];

interface SetupOptions {
  /**
  The error that the event request rejects with. The default is a request that succeeds.
  */
  eventError?: Error;
  /**
  The error that the scouts request rejects with. The default is a request that succeeds.
  */
  scoutsError?: Error;
  /**
  The error that the schedule request rejects with. The default is a request that succeeds.
  */
  scheduleError?: Error;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ eventError, scoutsError, scheduleError, parentRedirectsTo }: SetupOptions = {}) {
  getPublicUniversity.mockReset();
  getPublicUniversity.mockImplementation(() =>
    eventError ? Promise.reject(eventError) : Promise.resolve(sampleEvent),
  );
  listScouts.mockReset();
  listScouts.mockImplementation(() =>
    scoutsError ? Promise.reject(scoutsError) : Promise.resolve({ scouts: [alexSmith] }),
  );
  getSchedule.mockReset();
  getSchedule.mockImplementation(() =>
    scheduleError ? Promise.reject(scheduleError) : Promise.resolve({ registrations }),
  );

  return {
    params: { id: 'uni1' },
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

describe('registration page load', () => {
  it('gives the event of the route, the scouts of the parent and their registrations', async () => {
    await expect(load(setup())).resolves.toEqual({
      event: sampleEvent,
      scouts: [alexSmith],
      registrations,
    });
    expect(getPublicUniversity).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
    expect(getSchedule).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'uni1');
    expect(listScouts).toHaveBeenCalledOnce();
  });

  it('redirects to sign-in when the API refuses the token', async () => {
    const loadEvent = setup({
      scoutsError: new ApiError(401, { code: 'UNAUTHORIZED', message: 'Unauthorized' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });

  it('shows the error page with the message of the API when the event is not published', async () => {
    const loadEvent = setup({
      eventError: new ApiError(404, { code: 'NOT_FOUND', message: 'University not found' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 404,
      body: { message: 'University not found' },
    });
  });

  it('shows its fallback message for a load failure with no API message', async () => {
    const loadEvent = setup({ eventError: new ApiError(500, undefined) });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 500,
      body: { message: FALLBACK_MESSAGE },
    });
  });

  it('shows the error page when the scouts request fails', async () => {
    const loadEvent = setup({ scoutsError: new TypeError('Failed to fetch') });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 503,
      body: { message: FALLBACK_MESSAGE },
    });
  });

  it('shows the error page when the schedule request fails', async () => {
    const loadEvent = setup({
      scheduleError: new ApiError(403, { code: 'FORBIDDEN', message: 'Forbidden' }),
    });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 403,
      body: { message: 'Forbidden' },
    });
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
    expect(getPublicUniversity).not.toHaveBeenCalled();
    expect(listScouts).not.toHaveBeenCalled();
    expect(getSchedule).not.toHaveBeenCalled();
  });
});
