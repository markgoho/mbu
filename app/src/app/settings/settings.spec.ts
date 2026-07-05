import { HttpErrorResponse } from '@angular/common/http';
import { render, screen, waitFor, within } from '@testing-library/angular/zoneless';
import { describe, expect, it, vi } from 'vitest';
import type { ScoutListResponse, ScoutResponse } from '../api-types/users-api.types';
import { Auth } from '../services/auth';
import { Scouts } from '../services/scouts';
import { fakeResource } from '../test-utils/fake-resource';
import { Settings } from './settings';

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

describe('Settings component', () => {
  interface SetupOptions {
    scouts?: ScoutResponse[];
    removeScout?: (scoutId: string) => Promise<void>;
    deleteAccount?: () => Promise<void>;
  }

  async function setup({
    scouts = [alexSmith],
    removeScout = async () => {},
    deleteAccount = async () => {},
  }: SetupOptions = {}) {
    const scoutsMock = {
      mine: fakeResource<ScoutListResponse>({ scouts }),
      remove: async (scoutId: string) => {
        await removeScout(scoutId);
        scoutsMock.mine.set({
          scouts: (scoutsMock.mine.value()?.scouts ?? []).filter(
            (scout) => scout.scoutId !== scoutId,
          ),
        });
      },
    };
    const authMock = { deleteAccount };

    await render(Settings, {
      providers: [
        { provide: Scouts, useValue: scoutsMock },
        { provide: Auth, useValue: authMock },
      ],
    });
  }

  it("lists the parent's scouts", async () => {
    await setup();

    expect(await screen.findByText('Alex Smith')).toBeVisible();
  });

  it('shows a message when the parent has no scouts', async () => {
    await setup({ scouts: [] });

    expect(await screen.findByText("You don't have any scouts yet.")).toBeVisible();
  });

  it('deletes a scout after confirming', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    await setup();

    screen.getByRole('button', { name: 'Delete' }).click();

    await waitFor(() => expect(screen.queryByText('Alex Smith')).not.toBeInTheDocument());
  });

  it('does not delete a scout when the confirmation is declined', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    await setup();

    screen.getByRole('button', { name: 'Delete' }).click();

    expect(await screen.findByText('Alex Smith')).toBeVisible();
  });

  it('shows an error when scout deletion fails', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    await setup({
      removeScout: () => Promise.reject(new Error('boom')),
    });

    screen.getByRole('button', { name: 'Delete' }).click();

    expect(await screen.findByText('Could not delete this scout. Please try again.')).toBeVisible();
  });

  it('deletes the account after confirming', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    let called = false;
    await setup({
      deleteAccount: async () => {
        called = true;
      },
    });

    within(screen.getByRole('region', { name: 'Account' }))
      .getByRole('button', { name: 'Delete my account' })
      .click();

    await waitFor(() => expect(called).toBe(true));
  });

  it('surfaces the close-events-first message when account deletion is blocked', async () => {
    vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    await setup({
      deleteAccount: () =>
        Promise.reject(
          new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden',
            error: { error: 'Close your events first', code: 'close_events_first' },
          }),
        ),
    });

    within(screen.getByRole('region', { name: 'Account' }))
      .getByRole('button', { name: 'Delete my account' })
      .click();

    expect(
      await screen.findByText('Close your events first before deleting your account.'),
    ).toBeVisible();
  });
});
