import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { ReviewQueueRow } from '#lib/api-types/universities-api.types.js';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import Page from './+page.svelte';
import { sampleRow } from './reviewQueueFixture.js';

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Sam Superadmin',
    email: 'sam@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

interface SetupOptions {
  rows?: ReviewQueueRow[];
}

async function setup({ rows = [sampleRow] }: SetupOptions = {}) {
  await render(Page, { data: { session, universities: rows } });

  return { card: page.getByRole('listitem').getByRole('link') };
}

describe('review queue page', () => {
  it('renders a row per queued university', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible();
    await expect.element(page.getByText('Spring MBU')).toBeVisible();
    await expect.element(page.getByText(/Alex Chancellor/)).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: /Spring MBU/ }))
      .toHaveAttribute('href', '/admin/review/uni1');
  });

  it('shows the chancellor, the start date, the class count and the time of the submit', async () => {
    const { card } = await setup();

    // 00:00 UTC on July 1 is 20:00 on June 30 in America/New_York (the timezone of the specs).
    await expect
      .element(card)
      .toHaveTextContent(
        'Alex Chancellor (alex@example.com) · Jun 1, 2026 · 2 classes · submitted Jun 30, 2026, 8:00:00 PM',
      );
  });

  it('uses the singular for one class', async () => {
    const { card } = await setup({ rows: [{ ...sampleRow, classCount: 1 }] });

    await expect.element(card).toHaveTextContent('· 1 class ·');
    await expect.element(card).not.toHaveTextContent('1 classes');
  });

  it('shows no submit time for a row that has none', async () => {
    const { card } = await setup({ rows: [{ ...sampleRow, submittedAt: null }] });

    await expect.element(card).toHaveTextContent('· 2 classes');
    await expect.element(card).not.toHaveTextContent('submitted');
  });

  it('shows an empty state when nothing is queued', async () => {
    await setup({ rows: [] });

    await expect.element(page.getByText('Nothing is waiting for review.')).toBeVisible();
    await expect.element(page.getByRole('list')).not.toBeInTheDocument();
  });
});
