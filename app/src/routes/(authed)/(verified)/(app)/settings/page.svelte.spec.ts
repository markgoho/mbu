import { describe, expect, it, onTestFinished, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { BootstrapResponse, ScoutResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import Page from './+page.svelte';
import { signedIn } from '../../identityFixture.js';

const { removeScout, deleteAccount, refreshAll } = vi.hoisted(() => ({
  removeScout: vi.fn<(fetcher: Fetcher, scoutId: string) => Promise<void>>(),
  deleteAccount: vi.fn<(fetcher: Fetcher) => Promise<void>>(),
  refreshAll: vi.fn<() => Promise<void>>(),
}));
vi.mock('#lib/scouts.js', () => ({ removeScout }));
vi.mock('#lib/session.svelte.js', () => ({ deleteAccount }));
vi.mock('$app/navigation', () => ({ refreshAll, goto: vi.fn() }));

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

const alexSmith: ScoutResponse = {
  scoutId: 'scout1',
  firstName: 'Alex',
  lastName: 'Smith',
  unit: null,
  council: null,
  district: null,
  ageBand: null,
  bsaId: null,
  accommodations: null,
};

interface SetupOptions {
  scouts?: ScoutResponse[];
  /**
  The answer of the user to the confirm question of a deletion.
  */
  isConfirmed?: boolean;
  /**
  The error that the deletion of a scout rejects with.
  */
  removeScoutError?: Error;
  /**
  The error that the deletion of the account rejects with.
  */
  deleteAccountError?: Error;
}

async function setup({
  scouts = [alexSmith],
  isConfirmed = true,
  removeScoutError,
  deleteAccountError,
}: SetupOptions = {}) {
  const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(isConfirmed);
  onTestFinished(() => confirmSpy.mockRestore());

  // The fake API: the list that the `load` reads, and that a deletion changes.
  let storedScouts = scouts;
  removeScout.mockReset();
  removeScout.mockImplementation(async (_fetcher, scoutId) => {
    if (removeScoutError) throw removeScoutError;
    storedScouts = storedScouts.filter((scout) => scout.scoutId !== scoutId);
  });
  deleteAccount.mockReset();
  deleteAccount.mockImplementation(() =>
    deleteAccountError ? Promise.reject(deleteAccountError) : Promise.resolve(),
  );

  const { rerender } = await render(Page, { data: { ...signedIn, session, scouts: storedScouts } });
  // `refreshAll()` runs the `load` again, which gives the page new `data`.
  refreshAll.mockReset();
  refreshAll.mockImplementation(() =>
    rerender({ data: { ...signedIn, session, scouts: storedScouts } }),
  );

  return {
    confirmSpy,
    deleteScoutButton: page
      .getByRole('region', { name: 'Your scouts' })
      .getByRole('button', { name: 'Delete' }),
    deleteAccountButton: page
      .getByRole('region', { name: 'Account' })
      .getByRole('button', { name: 'Delete my account' }),
  };
}

describe('settings page', () => {
  it("lists the parent's scouts", async () => {
    await setup();

    await expect.element(page.getByText('Alex Smith')).toBeVisible();
  });

  it('shows a message when the parent has no scouts', async () => {
    await setup({ scouts: [] });

    await expect.element(page.getByText("You don't have any scouts yet.")).toBeVisible();
  });

  it('deletes a scout after confirming', async () => {
    const { confirmSpy, deleteScoutButton } = await setup();

    await deleteScoutButton.click();

    await expect.element(page.getByText('Alex Smith')).not.toBeInTheDocument();
    await expect.element(page.getByText("You don't have any scouts yet.")).toBeVisible();
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith(
      'Delete Alex Smith? This also cancels their registrations.',
    );
    expect(removeScout).toHaveBeenCalledExactlyOnceWith(expect.any(Function), 'scout1');
  });

  it('does not delete a scout when the confirmation is declined', async () => {
    const { deleteScoutButton } = await setup({ isConfirmed: false });

    await deleteScoutButton.click();

    await expect.element(page.getByText('Alex Smith')).toBeVisible();
    expect(removeScout).not.toHaveBeenCalled();
  });

  it('shows an error when scout deletion fails', async () => {
    const { deleteScoutButton } = await setup({
      removeScoutError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });

    await deleteScoutButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not delete this scout. Please try again.');
    await expect.element(page.getByText('Alex Smith')).toBeVisible();
  });

  it('deletes the account after confirming', async () => {
    const { confirmSpy, deleteAccountButton } = await setup();

    await deleteAccountButton.click();

    await expect.poll(() => deleteAccount).toHaveBeenCalledOnce();
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith(
      'Delete your account? This cannot be undone.',
    );
    // The button is enabled again when the deletion is complete.
    await expect.element(deleteAccountButton).toBeEnabled();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('does not delete the account when the confirmation is declined', async () => {
    const { deleteAccountButton } = await setup({ isConfirmed: false });

    await deleteAccountButton.click();

    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('surfaces the close-events-first message when account deletion is blocked', async () => {
    const { deleteAccountButton } = await setup({
      deleteAccountError: new ApiError(403, {
        code: 'CLOSE_EVENTS_FIRST',
        message: 'Close your events first',
      }),
    });

    await deleteAccountButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Close your events first before deleting your account.');
    await expect.element(deleteAccountButton).toBeEnabled();
  });

  it('shows a general message when account deletion fails for a different reason', async () => {
    const { deleteAccountButton } = await setup({
      deleteAccountError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });

    await deleteAccountButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not delete your account. Please try again.');
  });
});
