import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { PublicClass, PublicUniversity } from '#lib/api-types/universities-api.types.js';
import Page from './+page.svelte';
import type { EventLoadFailure } from './+page.js';
import { sampleEvent } from './publicEventFixture.js';

const campingClass = sampleEvent.classes[0] as PublicClass;

interface SetupOptions {
  event?: PublicUniversity;
  /**
  The reason that the event did not load. The default is an event that loaded.
  */
  failure?: EventLoadFailure;
}

async function setup({ event = sampleEvent, failure }: SetupOptions = {}) {
  await render(Page, { data: failure ? { event: undefined, failure } : { event } });
}

describe('public event page', () => {
  it('renders seat counts and the register CTA for a published event', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Spring MBU' })).toBeVisible();
    await expect.element(page.getByText(/8 of 20 seats filled/)).toBeVisible();
    await expect.element(page.getByText(/12 seats left/)).toBeVisible();

    // After the sign-in, the `returnTo` path opens the registration page of this event.
    await expect
      .element(page.getByRole('link', { name: 'Sign in to register' }))
      .toHaveAttribute('href', '/sign-in?returnTo=%2Fe%2Funi1%2Fregister');
  });

  it('shows a not-found message when the event is missing or unpublished', async () => {
    await setup({ failure: 'not-found' });

    await expect.element(page.getByRole('heading', { name: 'Event not found' })).toBeVisible();
    await expect
      .element(page.getByText(/not available or has not been published yet/))
      .toBeVisible();
    await expect.element(page.getByRole('link')).not.toBeInTheDocument();
  });

  it('shows a generic error for any other failure instead of a blank page', async () => {
    await setup({ failure: 'failed' });

    await expect.element(page.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect
      .element(page.getByText("We couldn't load this event. Please refresh to try again."))
      .toBeVisible();
  });

  it('shows the location and the dates of the event', async () => {
    await setup({ event: { ...sampleEvent, endDate: '2026-06-02T12:00:00.000Z' } });

    await expect.element(page.getByText('Scout Hall, Anytown, NY')).toBeVisible();
    await expect.element(page.getByText('Jun 1, 2026 – Jun 2, 2026')).toBeVisible();
  });

  it('shows the periods with their times in the timezone of the event', async () => {
    await setup({
      event: {
        ...sampleEvent,
        // The specs run in America/New_York, where 14:00 UTC is 10:00 AM.
        timezone: 'America/Chicago',
        periods: [
          {
            periodId: 'p1',
            label: 'Morning',
            startsAt: '2026-06-01T14:00:00.000Z',
            endsAt: '2026-06-01T15:30:00.000Z',
          },
        ],
      },
    });

    await expect.element(page.getByRole('heading', { name: 'Periods' })).toBeVisible();
    await expect.element(page.getByText('Morning · 9:00 AM – 10:30 AM')).toBeVisible();
  });

  it('shows no periods section for an event with no periods', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Classes' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Periods' })).not.toBeInTheDocument();
  });

  it('shows the details of a class', async () => {
    await setup({
      event: {
        ...sampleEvent,
        classes: [
          {
            ...campingClass,
            waitlistCount: 3,
            notes: 'Bring a tent',
            counselors: [{ displayName: 'Alex Counselor' }, { displayName: 'Bo Leader' }],
          },
        ],
      },
    });

    await expect.element(page.getByRole('heading', { name: 'Camping' })).toBeVisible();
    await expect.element(page.getByText('Eagle-required')).toBeVisible();
    await expect.element(page.getByText('3 on waitlist')).toBeVisible();
    await expect.element(page.getByText('Counselor: Alex Counselor, Bo Leader')).toBeVisible();
    await expect.element(page.getByText('Room: Room A')).toBeVisible();
    await expect.element(page.getByText('Bring a tent')).toBeVisible();
  });

  it('shows only the seats of a class that has no other details', async () => {
    await setup({
      event: {
        ...sampleEvent,
        classes: [{ ...campingClass, eagleRequired: false, room: null, counselors: [] }],
      },
    });

    await expect.element(page.getByText(/8 of 20 seats filled/)).toBeVisible();
    await expect.element(page.getByText('Eagle-required')).not.toBeInTheDocument();
    await expect.element(page.getByText(/on waitlist/)).not.toBeInTheDocument();
    await expect.element(page.getByText(/Counselor:/)).not.toBeInTheDocument();
    await expect.element(page.getByText(/Room:/)).not.toBeInTheDocument();
  });

  it('shows a message for an event with no classes', async () => {
    await setup({ event: { ...sampleEvent, classes: [] } });

    await expect.element(page.getByText('No classes listed yet.')).toBeVisible();
  });
});
