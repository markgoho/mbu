import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import Page from './+page.svelte';
import type { HealthStatus } from './+page.js';
import { signedIn } from '../identityFixture.js';

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Test Parent',
    email: 'parent@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

interface SetupOptions {
  /**
  The health read of the `load`. The default is an API that answered `ok`.
  */
  health?: Promise<HealthStatus>;
}

async function setup({ health = Promise.resolve('ok') }: SetupOptions = {}) {
  await render(Page, { data: { ...signedIn, session, health } });
  return { status: page.getByRole('status') };
}

describe('home page', () => {
  it('displays ok when the health read resolves', async () => {
    const { status } = await setup();

    await expect.element(status).toHaveTextContent('ok');
    await expect.element(page.getByText('Could not reach the API.')).not.toBeInTheDocument();
  });

  it('displays unavailable when the health read fails', async () => {
    const { status } = await setup({ health: Promise.resolve('unavailable') });

    await expect.element(status).toHaveTextContent('unavailable');
    await expect.element(page.getByText('Could not reach the API.')).toBeVisible();
  });

  it('displays loading while the health read is in progress', async () => {
    const pending = Promise.withResolvers<HealthStatus>();
    const { status } = await setup({ health: pending.promise });

    await expect.element(status).toHaveTextContent('loading…');

    pending.resolve('ok');

    await expect.element(status).toHaveTextContent('ok');
  });

  it('shows the app name and the link to the universities', async () => {
    await setup();

    await expect
      .element(page.getByRole('heading', { name: 'Merit Badge University Platform' }))
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Manage Universities' }))
      .toHaveAttribute('href', '/universities');
  });
});

// The only assertion on the timezone that vite.config.ts sets on the browser
// context of the `client` project. The date and time output of the pages
// depends on it.
describe('client project timezone', () => {
  it('is America/New_York', () => {
    expect(new Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York');
  });
});
