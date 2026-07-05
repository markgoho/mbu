import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import type { PublicUniversity } from '../api-types/universities-api.types';
import { Universities } from '../services/universities';
import { fakeResource } from '../test-utils/fake-resource';
import { PublicEvent } from './public-event';

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
  periods: [],
  classes: [
    {
      classId: 'cls1',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: ['p1'],
      room: 'Room A',
      notes: null,
      capacity: 20,
      enrolledCount: 8,
      seatsRemaining: 12,
      waitlistCount: 0,
      counselors: [{ displayName: 'Alex Counselor' }],
    },
  ],
};

describe('PublicEvent', () => {
  interface SetupOptions {
    event?: PublicUniversity;
    // The event is missing or hasn't been published yet.
    notFound?: boolean;
    // The event failed to load for any other reason.
    loadFails?: boolean;
  }

  async function setup({
    event = sampleEvent,
    notFound = false,
    loadFails = false,
  }: SetupOptions = {}) {
    const publicEvent = fakeResource<PublicUniversity>();
    if (notFound) {
      publicEvent.setError(new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
    } else if (loadFails) {
      publicEvent.setError(new HttpErrorResponse({ status: 500, statusText: 'Server Error' }));
    } else {
      publicEvent.set(event);
    }

    await render(PublicEvent, {
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'uni1' })) } },
        {
          provide: Universities,
          useValue: { publicEvent, openPublicUniversity: () => {} },
        },
      ],
    });
  }

  it('renders seat counts and the register CTA for a published event', async () => {
    await setup();

    expect(await screen.findByText('Spring MBU')).toBeVisible();
    expect(await screen.findByText(/8 of 20 seats filled/)).toBeVisible();
    expect(await screen.findByText(/12 seats left/)).toBeVisible();

    const cta = await screen.findByRole('link', { name: 'Sign in to register' });
    expect(cta).toBeVisible();
    expect(cta.getAttribute('href')).toContain('returnTo=%2Fe%2Funi1');
  });

  it('shows a not-found message when the event is missing or unpublished', async () => {
    await setup({ notFound: true });

    expect(await screen.findByText('Event not found')).toBeVisible();
    expect(await screen.findByText(/not available or has not been published yet/)).toBeVisible();
  });

  it('shows a generic error for any other failure instead of a blank page', async () => {
    await setup({ loadFails: true });

    expect(await screen.findByText('Something went wrong')).toBeVisible();
  });
});
