import { redirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { identity } from '../../identityFixture.js';
import { load } from './+layout.js';

interface SetupOptions {
  /**
  The superAdmin claim of the session.
  */
  superAdmin?: boolean;
  /**
  The `(app)` guard above this one redirects to this path. The default is that it lets the user through.
  */
  parentRedirectsTo?: string;
}

function setup({ superAdmin = true, parentRedirectsTo }: SetupOptions = {}) {
  const loadEvent = {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return { identity: { ...identity, superAdmin } };
    },
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

describe('admin layout load: requireSuperAdmin', () => {
  it('lets a super-admin through', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toBeUndefined();
  });

  it('redirects a user with no super-admin claim to the app home', async () => {
    const { loadEvent } = setup({ superAdmin: false });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/' });
  });

  it('gives the redirect of the guard above it, not its own', async () => {
    const { loadEvent } = setup({ superAdmin: false, parentRedirectsTo: '/onboarding' });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/onboarding' });
  });
});
