import { redirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { AuthState } from '#lib/auth.js';
import { identity } from './identityFixture.js';
import { load } from './+layout.js';

interface SetupOptions {
  /**
  The state that the `(authed)` guard gives. The default is signed in.
  */
  auth?: AuthState;
  /**
  The `(authed)` guard above this one redirects to this path. The default is that it lets the user through.
  */
  parentRedirectsTo?: string;
}

function setup({
  auth = { status: 'signed-in', session: identity },
  parentRedirectsTo,
}: SetupOptions = {}) {
  const loadEvent = {
    parent: async () => {
      if (parentRedirectsTo) redirect(303, parentRedirectsTo);
      return { auth };
    },
  } as unknown as Parameters<typeof load>[0];
  return { loadEvent };
}

describe('(verified) layout load: requireVerified', () => {
  it('gives the signed-in adult to the pages', async () => {
    const { loadEvent } = setup();

    await expect(load(loadEvent)).resolves.toEqual({ identity });
  });

  it('redirects a user with an email that is not verified to verify-email', async () => {
    const { loadEvent } = setup({ auth: { status: 'unverified', email: 'new@example.com' } });

    await expect(load(loadEvent)).rejects.toMatchObject({
      status: 303,
      location: '/verify-email',
    });
  });

  it('gives the redirect of the guard above it, not its own', async () => {
    const { loadEvent } = setup({
      auth: { status: 'unverified', email: 'new@example.com' },
      parentRedirectsTo: '/sign-in',
    });

    await expect(load(loadEvent)).rejects.toMatchObject({ status: 303, location: '/sign-in' });
  });
});
