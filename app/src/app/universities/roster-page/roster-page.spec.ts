import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { provideRouter, RouterLink, RouterOutlet } from '@angular/router';
import { render, screen, waitFor } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { RosterResponse } from '../../api-types/registrations-api.types';
import { Auth } from '../../services/auth';
import { Registrations } from '../../services/registrations';
import { Universities } from '../../services/universities';
import { fakeResource } from '../../test-utils/fake-resource';
import { RosterPage } from './roster-page';

/** Minimal Auth stand-in — RosterPage only reads sessionUser() and calls ackRosterExport(). */
function fakeAuth(rosterExportAckAt: string | null = null) {
  const sessionUser = signal<{ rosterExportAckAt: string | null } | undefined>({
    rosterExportAckAt,
  });
  return {
    sessionUser,
    ackRosterExport: async () => {
      sessionUser.set({ rosterExportAckAt: '2026-07-05T00:00:00.000Z' });
    },
  };
}

// Root under test: the "View rosters" link the chancellor follows plus the
// outlet its destination (and the 403 redirect target) render into.
@Component({
  template: `
    <a routerLink="/universities/uni1/roster">View rosters</a>
    <router-outlet />
  `,
  imports: [RouterLink, RouterOutlet],
})
class TestApp {}

/** Redirect target — renders the flash message so tests assert on what the user sees. */
@Component({
  template:
    '<p>Dashboard{{ universities.flashMessage() ? ": " + universities.flashMessage() : "" }}</p>',
})
class DashboardStub {
  protected readonly universities = inject(Universities);
}

const sampleRoster: RosterResponse = {
  university: {
    title: 'Spring MBU',
    startDate: '2026-06-01T12:00:00.000Z',
    endDate: null,
    location: {
      name: 'Scout Hall',
      address: '1 Main St',
      city: 'Anytown',
      state: 'NY',
      zip: '12345',
    },
    timezone: 'America/New_York',
  },
  classRosters: [
    {
      class: {
        classId: 'cls1',
        badgeTitle: 'Camping',
        periodLabels: ['Period 1'],
        room: 'Room A',
        capacity: 10,
        enrolledCount: 1,
        waitlistCount: 1,
        counselorNames: ['Pat Counselor'],
      },
      enrolled: [
        {
          scoutId: 'scout1',
          scoutFirstName: 'Alex',
          scoutLastName: 'Smith',
          scoutUnit: 'Troop 1',
          accommodations: null,
          parentName: 'Jamie Smith',
          parentEmail: 'jamie@example.com',
          consentReceived: true,
          status: 'enrolled',
        },
      ],
      waitlisted: [
        {
          scoutId: 'scout2',
          scoutFirstName: 'Sam',
          scoutLastName: 'Jones',
          scoutUnit: null,
          accommodations: 'Wheelchair access',
          parentName: 'Robin Jones',
          parentEmail: 'robin@example.com',
          consentReceived: false,
          status: 'waitlisted',
        },
      ],
    },
    {
      class: {
        classId: 'cls2',
        badgeTitle: 'Archery',
        periodLabels: ['Period 2'],
        room: null,
        capacity: 5,
        enrolledCount: 0,
        waitlistCount: 0,
        counselorNames: [],
      },
      enrolled: [],
      waitlisted: [],
    },
  ],
};

describe('RosterPage', () => {
  interface SetupOptions {
    // The signed-in user isn't allowed to see these rosters.
    forbidden?: boolean;
    // ISO timestamp if the user already acknowledged the export warning.
    ackedAt?: string | null;
  }

  async function setup({ forbidden = false, ackedAt = null }: SetupOptions = {}) {
    const rosterResource = fakeResource<RosterResponse>();
    if (forbidden) {
      rosterResource.setError(new HttpErrorResponse({ status: 403, statusText: 'Forbidden' }));
    } else {
      rosterResource.set(sampleRoster);
    }

    const user = userEvent.setup();
    await render(TestApp, {
      providers: [
        provideRouter([
          { path: 'universities/:id/roster', component: RosterPage },
          { path: 'universities', component: DashboardStub },
        ]),
        { provide: Registrations, useValue: { roster: rosterResource, openRoster: () => {} } },
        { provide: Universities, useValue: { flashMessage: signal<string | null>(null) } },
        { provide: Auth, useValue: fakeAuth(ackedAt) },
      ],
    });

    return {
      async openRosters() {
        await user.click(await screen.findByRole('link', { name: 'View rosters' }));
      },
      async clickPrint() {
        await user.click(screen.getByRole('button', { name: 'Print' }));
      },
      user,
    };
  }

  it("renders each class's enrolled and waitlisted tables, including an empty class", async () => {
    const { openRosters } = await setup();

    await openRosters();

    expect(await screen.findByText('Spring MBU — Rosters')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Camping' })).toBeVisible();
    expect(screen.getByText('Smith')).toBeVisible();
    expect(screen.getByText('Jones')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Archery' })).toBeVisible();
    expect(screen.getByText('No one enrolled.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Print' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Export event CSV' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Export CSV' })).toHaveLength(2);
  });

  it('shows the export-warning modal and acks it before the first export', async () => {
    vi.spyOn(globalThis, 'print').mockImplementation(() => {});
    const { openRosters, clickPrint } = await setup();
    await openRosters();

    expect(await screen.findByRole('heading', { name: 'Camping' })).toBeVisible();
    await clickPrint();

    expect(
      await screen.findByRole('alertdialog', { name: /Export contains youth information/ }),
    ).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'I understand, continue' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('skips the modal on subsequent exports once already acked', async () => {
    vi.spyOn(globalThis, 'print').mockImplementation(() => {});
    const { openRosters, clickPrint } = await setup({ ackedAt: '2026-07-01T00:00:00.000Z' });
    await openRosters();

    expect(await screen.findByRole('heading', { name: 'Camping' })).toBeVisible();
    await clickPrint();

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('dismisses the modal without exporting when cancelled', async () => {
    const { openRosters, clickPrint } = await setup();
    await openRosters();

    expect(await screen.findByRole('heading', { name: 'Camping' })).toBeVisible();
    await clickPrint();
    expect(await screen.findByRole('alertdialog')).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('redirects to the dashboard with a flash message when access is forbidden', async () => {
    const { openRosters } = await setup({ forbidden: true });

    await openRosters();

    expect(
      await screen.findByText('Dashboard: You do not have access to those rosters.'),
    ).toBeVisible();
  });
});
