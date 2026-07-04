import type { RosterResponse } from '../../src/app/api-types/registrations-api.types';
import type { UniversityListResponse } from '../../src/app/api-types/universities-api.types';
import { expect, test } from '../fixtures/auth.fixture';

/**
 * Chancellor/counselor roster view, fully mocked except the Auth emulator.
 * Mirrors registration.spec.ts's use of the verifiedPage fixture.
 */

const UNIVERSITY_ID = 'summer-2026';

function buildRoster(): RosterResponse {
  return {
    university: {
      title: 'Summer 2026 MBU',
      startDate: '2026-07-10T13:00:00.000Z',
      endDate: '2026-07-10T20:00:00.000Z',
      location: {
        name: 'Central High School',
        address: '100 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      },
      timezone: 'America/Chicago',
    },
    classRosters: [
      {
        class: {
          classId: 'cls-camping',
          badgeTitle: 'Camping',
          periodLabels: ['Morning'],
          room: 'Room A',
          capacity: 2,
          enrolledCount: 1,
          waitlistCount: 1,
          counselorNames: ['Pat Counselor'],
        },
        enrolled: [
          {
            scoutId: 'scout-alex',
            scoutFirstName: 'Alex',
            scoutLastName: 'Scout',
            scoutUnit: 'Troop 1',
            accommodations: null,
            parentName: 'Jamie Guardian',
            parentEmail: 'jamie@example.com',
            consentReceived: true,
            status: 'enrolled',
          },
        ],
        waitlisted: [
          {
            scoutId: 'scout-jamie',
            scoutFirstName: 'Jamie',
            scoutLastName: 'Scout',
            scoutUnit: null,
            accommodations: 'Peanut allergy',
            parentName: 'Robin Guardian',
            parentEmail: 'robin@example.com',
            consentReceived: true,
            status: 'waitlisted',
          },
        ],
      },
      {
        class: {
          classId: 'cls-fishing',
          badgeTitle: 'Fishing',
          periodLabels: ['Afternoon'],
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
}

test.describe('roster page', () => {
  test('renders enrolled/waitlisted tables per class, including an empty class', async ({
    verifiedPage: page,
  }) => {
    await page.route(`**/api/registrations/${UNIVERSITY_ID}/roster`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildRoster()),
      }),
    );

    await page.goto(`/universities/${UNIVERSITY_ID}/roster`);

    await expect(page.getByRole('heading', { name: 'Summer 2026 MBU — Rosters' })).toBeVisible();

    const campingSection = page.locator('.roster-page__class', { hasText: 'Camping' });
    await expect(campingSection.getByText('Alex', { exact: true })).toBeVisible();
    await expect(campingSection.getByText('Jamie', { exact: true })).toBeVisible();
    await expect(campingSection.getByRole('button', { name: 'Export CSV' })).toBeVisible();

    const fishingSection = page.locator('.roster-page__class', { hasText: 'Fishing' });
    await expect(fishingSection.getByText('No one enrolled.')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export event CSV' })).toBeVisible();
  });

  test('redirects to the dashboard with a flash message on 403', async ({ verifiedPage: page }) => {
    await page.route(`**/api/registrations/${UNIVERSITY_ID}/roster`, (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      }),
    );
    await page.route('**/api/universities/mine', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ universities: [] } satisfies UniversityListResponse),
      }),
    );

    await page.goto(`/universities/${UNIVERSITY_ID}/roster`);

    await page.waitForURL('**/universities');
    await expect(page.getByText('You do not have access to those rosters.')).toBeVisible();
  });
});
