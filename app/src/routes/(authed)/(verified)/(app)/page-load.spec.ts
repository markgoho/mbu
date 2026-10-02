import { redirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { HealthResponse } from '#lib/api-types/health-api.types.js';
import { load, type HealthStatus } from './+page.js';

const { getHealth } = vi.hoisted(() => ({ getHealth: vi.fn<() => Promise<HealthResponse>>() }));

vi.mock('#lib/health.js', () => ({ getHealth }));
vi.mock('#lib/firebase.js', () => ({ getFirebaseAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

interface SetupOptions {
  /**
  The health request. The default is an API that answers `ok`.
  */
  health?: Promise<HealthResponse>;
  /**
  A guard above this page redirects to this path. The default is that the guards let the user through.
  */
  parentRedirectsTo?: string;
}

function setup({
  health = Promise.resolve({ status: 'ok' }),
  parentRedirectsTo,
}: SetupOptions = {}) {
  getHealth.mockReset();
  getHealth.mockReturnValue(health);

  return {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return {};
    },
  } as unknown as Parameters<typeof load>[0];
}

async function loadHealth(options: SetupOptions = {}) {
  // The result stays in its object: an `await` of the promise itself would wait for the read.
  return (await load(setup(options))) as { health: Promise<HealthStatus> };
}

describe('home page load', () => {
  it('gives the status of the API', async () => {
    const { health } = await loadHealth();

    await expect(health).resolves.toBe('ok');
  });

  it('gives unavailable when the health request fails', async () => {
    const failure = Promise.reject(new Error('unreachable'));

    const { health } = await loadHealth({ health: failure });

    await expect(health).resolves.toBe('unavailable');
  });

  it('does not wait for the health request', async () => {
    const pending = Promise.withResolvers<HealthResponse>();

    const { health } = await loadHealth({ health: pending.promise });
    const first = await Promise.race([health, Promise.resolve('still pending')]);

    expect(first).toBe('still pending');
  });

  it('does not call the API when a guard redirects', async () => {
    const loadEvent = setup({ parentRedirectsTo: '/sign-in' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
    expect(getHealth).not.toHaveBeenCalled();
  });
});
