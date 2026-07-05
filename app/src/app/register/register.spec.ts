import { HttpErrorResponse } from '@angular/common/http';
import { signal, type WritableSignal } from '@angular/core';
import { render, screen, waitFor, within } from '@testing-library/angular/zoneless';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type {
  RegisterRequest,
  RegistrationResponse,
  RegistrationStatus,
  ScheduleResponse,
} from '../api-types/registrations-api.types';
import type { PublicUniversity } from '../api-types/universities-api.types';
import type { ScoutListResponse, ScoutResponse } from '../api-types/users-api.types';
import { Registrations } from '../services/registrations';
import { Scouts } from '../services/scouts';
import { Universities } from '../services/universities';
import { Register } from './register';

const sampleEvent: PublicUniversity = {
  id: 'uni1',
  title: 'Spring MBU',
  timezone: 'America/New_York',
  startDate: '2026-06-01T12:00:00.000Z',
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: '2026-05-25T23:59:59.000Z',
  location: {
    name: 'Scout Hall',
    address: '1 Main St',
    city: 'Anytown',
    state: 'NY',
    zip: '12345',
  },
  periods: [
    {
      periodId: 'p1',
      label: 'Period 1',
      startsAt: '2026-06-01T13:00:00.000Z',
      endsAt: '2026-06-01T14:00:00.000Z',
    },
    {
      periodId: 'p2',
      label: 'Period 2',
      startsAt: '2026-06-01T14:00:00.000Z',
      endsAt: '2026-06-01T15:00:00.000Z',
    },
  ],
  classes: [
    // Camping is full — its default action is "Join waitlist".
    {
      classId: 'camping',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: ['p1'],
      room: null,
      notes: null,
      capacity: 10,
      enrolledCount: 10,
      seatsRemaining: 0,
      waitlistCount: 0,
      counselors: [],
    },
    {
      classId: 'archery',
      badgeSlug: 'archery',
      badgeTitle: 'Archery',
      eagleRequired: false,
      periodIds: ['p1'],
      room: null,
      notes: null,
      capacity: 10,
      enrolledCount: 2,
      seatsRemaining: 8,
      waitlistCount: 0,
      counselors: [],
    },
    {
      classId: 'hiking',
      badgeSlug: 'hiking',
      badgeTitle: 'Hiking',
      eagleRequired: true,
      periodIds: ['p2'],
      room: null,
      notes: null,
      capacity: 10,
      enrolledCount: 2,
      seatsRemaining: 8,
      waitlistCount: 0,
      counselors: [],
    },
  ],
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

function registrationFor(classId: string, status: RegistrationStatus): RegistrationResponse {
  const cls = sampleEvent.classes.find((c) => c.classId === classId)!;
  return {
    scoutId: 'scout1',
    classId,
    universityId: 'uni1',
    status,
    periodIds: cls.periodIds,
    badgeSlug: cls.badgeSlug,
    badgeTitle: cls.badgeTitle,
    waitlistedAt: status === 'waitlisted' ? '2026-01-01T00:00:00.000Z' : null,
    enrolledAt: status === 'enrolled' ? '2026-01-01T00:00:00.000Z' : null,
  };
}

/** Minimal stand-in for an `httpResource` — just the signals the UI reads. */
function fakeResource<T>(value: WritableSignal<T | undefined>) {
  return { value, isLoading: signal(false), error: signal<unknown>(undefined), reload: () => {} };
}

describe('Register component', () => {
  interface SetupOptions {
    scouts?: ScoutResponse[];
    registrations?: RegistrationResponse[];
    // How the API responds to the register the user triggers.
    registerOutcome?: 'enrolled' | 'waitlisted' | 'full-then-waitlist';
  }

  async function setup({
    scouts = [alexSmith],
    registrations = [],
    registerOutcome = 'enrolled',
  }: SetupOptions = {}) {
    const scheduleValue = signal<ScheduleResponse | undefined>({ registrations });

    let registerCalls = 0;
    const register = async (
      _universityId: string,
      classId: string,
      body: RegisterRequest,
    ): Promise<RegistrationResponse> => {
      registerCalls += 1;
      const rejectsAsFull = registerOutcome === 'full-then-waitlist' && registerCalls === 1;
      if (rejectsAsFull && !body.acceptWaitlist) {
        throw new HttpErrorResponse({
          status: 409,
          statusText: 'Conflict',
          error: { error: 'Class is full', code: 'class_full' },
        });
      }
      const status: RegistrationStatus = registerOutcome === 'enrolled' ? 'enrolled' : 'waitlisted';
      const reg = registrationFor(classId, status);
      scheduleValue.update((s) => ({ registrations: [...(s?.registrations ?? []), reg] }));
      return reg;
    };

    const registrationsMock = {
      schedule: fakeResource(scheduleValue),
      openUniversity: () => {},
      register,
      cancel: async () => {},
    };
    const universitiesMock = {
      publicEvent: fakeResource(signal<PublicUniversity | undefined>(sampleEvent)),
      openPublicUniversity: () => {},
      reloadPublicEvent: () => {},
    };
    const scoutsMock = {
      mine: fakeResource(signal<ScoutListResponse | undefined>({ scouts })),
      create: async (): Promise<ScoutResponse> => alexSmith,
    };

    await render(Register, {
      providers: [
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'uni1' })) } },
        { provide: Registrations, useValue: registrationsMock },
        { provide: Universities, useValue: universitiesMock },
        { provide: Scouts, useValue: scoutsMock },
      ],
    });
  }

  it('shows the event, the scout picker, and starting progress', async () => {
    await setup();

    expect(await screen.findByText('Register for Spring MBU')).toBeVisible();
    expect(await screen.findByText('Alex Smith')).toBeVisible();
    expect(await screen.findByText('0/2 periods scheduled')).toBeVisible();
  });

  it("blocks a class that shares a period with the scout's enrolled class", async () => {
    await setup({ registrations: [registrationFor('archery', 'enrolled')] });

    // Camping (p1) collides with the enrolled Archery (p1).
    expect(await screen.findByText(/Conflicts with Archery/)).toBeVisible();
  });

  it("blocks a class that shares a period with the scout's waitlisted class (the waitlist holds the slot)", async () => {
    await setup({ registrations: [registrationFor('archery', 'waitlisted')] });

    expect(await screen.findByText(/Conflicts with Archery/)).toBeVisible();
  });

  it("counts a waitlisted class toward the scout's scheduled periods", async () => {
    await setup({ registrations: [registrationFor('archery', 'waitlisted')] });

    expect(await screen.findByText('1/2 periods scheduled')).toBeVisible();
  });

  it('marks the class as registered after the scout registers', async () => {
    await setup({ registerOutcome: 'enrolled' });

    screen.getByRole('checkbox').click();
    const archeryCard = (await screen.findByText('Archery')).closest('li') as HTMLElement;
    await waitFor(() =>
      expect(within(archeryCard).getByRole('button', { name: 'Register' })).toBeEnabled(),
    );
    within(archeryCard).getByRole('button', { name: 'Register' }).click();

    expect(await within(archeryCard).findByText('Registered')).toBeVisible();
    expect(within(archeryCard).getByRole('button', { name: 'Drop' })).toBeVisible();
  });

  it('offers the waitlist when a class turns out to be full, then shows the scout as waitlisted', async () => {
    await setup({ registerOutcome: 'full-then-waitlist' });

    screen.getByRole('checkbox').click();
    const archeryCard = (await screen.findByText('Archery')).closest('li') as HTMLElement;
    await waitFor(() =>
      expect(within(archeryCard).getByRole('button', { name: 'Register' })).toBeEnabled(),
    );
    within(archeryCard).getByRole('button', { name: 'Register' }).click();

    expect(await within(archeryCard).findByText(/This class is full/)).toBeVisible();
    within(archeryCard).getByRole('button', { name: 'Join waitlist' }).click();

    expect(await within(archeryCard).findByText('On waitlist')).toBeVisible();
  });

  it('disables Register and Drop until the consent checkbox is checked', async () => {
    await setup({ registrations: [registrationFor('archery', 'enrolled')] });

    const archeryCard = (await screen.findByText('Archery')).closest('li') as HTMLElement;
    const hikingCard = (await screen.findByText('Hiking')).closest('li') as HTMLElement;
    expect(within(archeryCard).getByRole('button', { name: 'Drop' })).toBeDisabled();
    expect(within(hikingCard).getByRole('button', { name: 'Register' })).toBeDisabled();

    screen.getByRole('checkbox').click();

    await waitFor(() => {
      expect(within(archeryCard).getByRole('button', { name: 'Drop' })).toBeEnabled();
      expect(within(hikingCard).getByRole('button', { name: 'Register' })).toBeEnabled();
    });
  });

  it('shows a single consent checkbox for the whole event', async () => {
    await setup();

    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  });

  it('prompts the caller to add a scout when they have none', async () => {
    await setup({ scouts: [] });

    expect(await screen.findByText('Add a scout to get started')).toBeVisible();
  });
});
