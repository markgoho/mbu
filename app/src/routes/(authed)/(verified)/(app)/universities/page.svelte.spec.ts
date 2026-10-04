import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { UniversitySummary } from '#lib/api-types/universities-api.types.js';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import Page from './+page.svelte';
import { signedIn } from '../../identityFixture.js';

const { goto } = vi.hoisted(() => ({
  goto: vi.fn<(url: string, options?: { replaceState?: boolean }) => Promise<void>>(),
}));
vi.mock('$app/navigation', () => ({ goto }));

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Casey Chancellor',
    email: 'casey@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

const springMbu: UniversitySummary = {
  id: 'uni1',
  title: 'Spring MBU',
  status: 'draft',
  startDate: '2026-06-01T12:00:00.000Z',
  endDate: null,
  classCount: 2,
};

interface SetupOptions {
  universities?: UniversitySummary[];
  /**
  The message of the `load` for a user that a 403 sent to the dashboard.
  */
  deniedMessage?: string;
}

async function setup({ universities = [springMbu], deniedMessage }: SetupOptions = {}) {
  const { rerender } = await render(Page, {
    data: { ...signedIn, session, universities, deniedMessage },
  });
  // The navigation to the URL with no query runs the `load` again, which gives no message.
  goto.mockReset();
  goto.mockImplementation(() =>
    rerender({ data: { ...signedIn, session, universities, deniedMessage: undefined } }),
  );

  return { card: page.getByRole('listitem').getByRole('link') };
}

describe('universities dashboard', () => {
  it('lists a university with its status, its date and its class count', async () => {
    const { card } = await setup();

    await expect.element(page.getByRole('heading', { name: 'Your Universities' })).toBeVisible();
    await expect.element(card).toHaveAttribute('href', '/universities/uni1');
    await expect.element(card).toHaveTextContent('Spring MBU');
    await expect.element(card).toHaveTextContent('draft · Jun 1, 2026 · 2 classes');
  });

  it('shows the end date of an event of more than one day', async () => {
    const { card } = await setup({
      universities: [{ ...springMbu, endDate: '2026-06-02T21:00:00.000Z' }],
    });

    await expect.element(card).toHaveTextContent('Jun 1, 2026 – Jun 2, 2026 · 2 classes');
  });

  it('uses the singular for one class', async () => {
    const { card } = await setup({ universities: [{ ...springMbu, classCount: 1 }] });

    await expect.element(card).toHaveTextContent('· 1 class');
    await expect.element(card).not.toHaveTextContent('1 classes');
  });

  it('links to the create page', async () => {
    await setup();

    await expect
      .element(page.getByRole('link', { name: 'Create University' }))
      .toHaveAttribute('href', '/universities/new');
  });

  it('shows a message and a create link when the user has no university', async () => {
    await setup({ universities: [] });

    await expect.element(page.getByText('You have not created a University yet.')).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Create one' }))
      .toHaveAttribute('href', '/universities/new');
    await expect.element(page.getByRole('list')).not.toBeInTheDocument();
  });

  it('shows no denied message by default', async () => {
    await setup();

    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  it('shows the denied message after a redirect from a university of a different user', async () => {
    await setup({ deniedMessage: 'You do not have access to that university.' });

    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent('You do not have access to that university.');
  });

  it('removes the denied message and its query parameter when the user dismisses it', async () => {
    await setup({ deniedMessage: 'You do not have access to that university.' });

    await page.getByRole('button', { name: 'Dismiss' }).click();

    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
    expect(goto).toHaveBeenCalledExactlyOnceWith('/universities', { replaceState: true });
  });
});
