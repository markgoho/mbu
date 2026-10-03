import type { Locator, Page } from '@playwright/test';
import type { ApiErrorBody } from '../src/lib/api-types/api-error.types.js';
import type {
  RegistrationResponse,
  ScheduleResponse,
} from '../src/lib/api-types/registrations-api.types.js';
import type {
  Period,
  PublicClass,
  PublicUniversity,
} from '../src/lib/api-types/universities-api.types.js';
import type { ScoutListResponse } from '../src/lib/api-types/users-api.types.js';
import { expect, test } from './fixtures/auth.fixture.js';

/**
 * The registration flow of a parent. Auth is the emulator. The API is mocked,
 * on top of the mocks of the `verifiedPage` fixture: the public event read, the
 * scout list, the schedule read, and the register and cancel writes.
 */

const UNIVERSITY_ID = 'summer-2026';

const PERIOD_MORNING: Period = {
  periodId: 'p1',
  label: 'Morning',
  startsAt: '2026-07-10T13:00:00.000Z',
  endsAt: '2026-07-10T15:00:00.000Z',
};

const PERIOD_AFTERNOON: Period = {
  periodId: 'p2',
  label: 'Afternoon',
  startsAt: '2026-07-10T17:00:00.000Z',
  endsAt: '2026-07-10T19:00:00.000Z',
};

// Same period (p1) so registering into both simultaneously is a conflict.
const CLASS_CAMPING: PublicClass = {
  classId: 'cls-camping',
  badgeSlug: 'camping',
  badgeTitle: 'Camping',
  eagleRequired: true,
  periodIds: ['p1'],
  room: null,
  notes: null,
  capacity: 10,
  enrolledCount: 3,
  seatsRemaining: 7,
  waitlistCount: 0,
  counselors: [],
};

const CLASS_FISHING: PublicClass = {
  classId: 'cls-fishing',
  badgeSlug: 'fishing',
  badgeTitle: 'Fishing',
  eagleRequired: false,
  periodIds: ['p1'],
  room: null,
  notes: null,
  capacity: 10,
  enrolledCount: 3,
  seatsRemaining: 7,
  waitlistCount: 0,
  counselors: [],
};

// Alone in period p2 - no conflict, used for the enroll/waitlist/drop flow.
const CLASS_COOKING: PublicClass = {
  classId: 'cls-cooking',
  badgeSlug: 'cooking',
  badgeTitle: 'Cooking',
  eagleRequired: true,
  periodIds: ['p2'],
  room: null,
  notes: null,
  capacity: 5,
  enrolledCount: 2,
  seatsRemaining: 3,
  waitlistCount: 0,
  counselors: [],
};

function buildEvent(): PublicUniversity {
  return {
    id: UNIVERSITY_ID,
    title: 'Summer 2026 MBU',
    timezone: 'America/Chicago',
    startDate: '2026-07-10',
    endDate: '2026-07-10',
    registrationOpensAt: null,
    registrationClosesAt: '2026-07-01T00:00:00.000Z',
    location: {
      name: 'Central High School',
      address: '100 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    },
    periods: [PERIOD_MORNING, PERIOD_AFTERNOON],
    classes: [CLASS_CAMPING, CLASS_FISHING, CLASS_COOKING],
  };
}

const SCOUT_ALEX = {
  scoutId: 'scout-alex',
  firstName: 'Alex',
  lastName: 'Scout',
  unit: null,
  council: null,
  district: null,
  ageBand: null,
  bsaId: null,
  accommodations: null,
};

const SCOUT_JAMIE = {
  scoutId: 'scout-jamie',
  firstName: 'Jamie',
  lastName: 'Scout',
  unit: null,
  council: null,
  district: null,
  ageBand: null,
  bsaId: null,
  accommodations: null,
};

function registration(
  overrides: Partial<RegistrationResponse> & Pick<RegistrationResponse, 'scoutId' | 'classId'>,
): RegistrationResponse {
  const publicClass = [CLASS_CAMPING, CLASS_FISHING, CLASS_COOKING].find(
    (candidate) => candidate.classId === overrides.classId,
  );
  if (!publicClass) throw new Error(`No class fixture has the ID ${overrides.classId}`);
  return {
    universityId: UNIVERSITY_ID,
    status: 'enrolled',
    periodIds: publicClass.periodIds,
    badgeSlug: publicClass.badgeSlug,
    badgeTitle: publicClass.badgeTitle,
    waitlistedAt: null,
    enrolledAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
Wires the always-on mocks (public event + scout list) shared by every test.
*/
async function mockEventAndScouts(
  page: Page,
  scouts: ScoutListResponse['scouts'] = [SCOUT_ALEX],
): Promise<void> {
  await page.route(`**/api/universities/${UNIVERSITY_ID}/public`, (route) =>
    route.fulfill({ json: buildEvent() }),
  );
  await page.route('**/api/users/me/scouts', (route) =>
    route.fulfill({ json: { scouts } satisfies ScoutListResponse }),
  );
}

/**
 * Mocks the schedule read with an array that the register and cancel mocks
 * change. The page reads the schedule again after each write, and then gets
 * the changed array, as it does from the real API.
 */
async function mockSchedule(
  page: Page,
  initial: RegistrationResponse[] = [],
): Promise<RegistrationResponse[]> {
  const registrations = [...initial];
  await page.route(`**/api/registrations/${UNIVERSITY_ID}`, (route) =>
    route.fulfill({ json: { registrations } satisfies ScheduleResponse }),
  );
  return registrations;
}

/**
The card of a class in the schedule builder.
*/
function classCard(page: Page, badgeTitle: string): Locator {
  return page
    .getByRole('listitem')
    .filter({ has: page.getByRole('heading', { name: badgeTitle, exact: true }) });
}

test.describe('parent registration flow', () => {
  test('enroll hits CLASS_FULL, joins waitlist, then drops', async ({ verifiedPage: page }) => {
    await mockEventAndScouts(page);
    const registrations = await mockSchedule(page);

    let registerAttempts = 0;
    await page.route(`**/api/registrations/${UNIVERSITY_ID}/cls-cooking`, (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      registerAttempts += 1;
      if (registerAttempts === 1) {
        return route.fulfill({
          status: 409,
          json: { code: 'CLASS_FULL', message: 'This class is full.' } satisfies ApiErrorBody,
        });
      }
      const waitlisted = registration({
        scoutId: SCOUT_ALEX.scoutId,
        classId: 'cls-cooking',
        status: 'waitlisted',
        enrolledAt: null,
        waitlistedAt: '2026-06-02T00:00:00.000Z',
      });
      registrations.push(waitlisted);
      return route.fulfill({ status: 201, json: waitlisted });
    });
    await page.route(
      `**/api/registrations/${UNIVERSITY_ID}/cls-cooking/${SCOUT_ALEX.scoutId}`,
      (route) => {
        if (route.request().method() !== 'DELETE') return route.fallback();
        registrations.splice(
          registrations.findIndex((candidate) => candidate.classId === 'cls-cooking'),
          1,
        );
        return route.fulfill({ status: 204, body: '' });
      },
    );

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    // === Page structure ===
    await expect(page.getByRole('heading', { name: 'Register for Summer 2026 MBU' })).toBeVisible();
    // The times are in the timezone of the event (America/Chicago), not of the browser.
    await expect(
      page.getByRole('heading', { name: 'Afternoon · 12:00 PM – 2:00 PM' }),
    ).toBeVisible();
    const cookingCard = classCard(page, 'Cooking');
    await expect(cookingCard.getByRole('button', { name: 'Register' })).toBeDisabled();

    // === Register, waitlist, drop ===

    // No registration without the consent for the selected scout.
    await page.getByRole('checkbox').check();

    // First attempt: UI thought seats were open, backend says the class just filled.
    await cookingCard.getByRole('button', { name: 'Register' }).click();
    await expect(
      cookingCard.getByText('This class is full. Join the waitlist instead?'),
    ).toBeVisible();

    // Confirm -> retries with acceptWaitlist:true, which the mock now accepts.
    await cookingCard.getByRole('button', { name: 'Join waitlist' }).click();
    await expect(cookingCard.getByText('On waitlist')).toBeVisible();
    await expect(cookingCard.getByRole('button', { name: 'Drop' })).toBeVisible();
    expect(registerAttempts).toBe(2);

    // Drop the class.
    page.once('dialog', (dialog) => dialog.accept());
    await cookingCard.getByRole('button', { name: 'Drop' }).click();
    await expect(cookingCard.getByRole('button', { name: 'Register' })).toBeVisible();
  });

  test('a period-conflicting class is disabled with an explanation', async ({
    verifiedPage: page,
  }) => {
    await mockEventAndScouts(page);
    await mockSchedule(page, [
      registration({ scoutId: SCOUT_ALEX.scoutId, classId: 'cls-camping', status: 'enrolled' }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = classCard(page, 'Camping');
    await expect(campingCard.getByRole('button', { name: 'Drop' })).toBeVisible();

    const fishingCard = classCard(page, 'Fishing');
    await expect(fishingCard.getByText('Conflicts with Camping in this period.')).toBeVisible();
    const fishingButton = fishingCard.getByRole('button', { name: 'Register' });
    await expect(fishingButton).toBeDisabled();
    await expect(fishingButton).toHaveAttribute('title', 'Resolve the period conflict first');
  });

  test('a class sharing a period with a waitlisted registration is disabled', async ({
    verifiedPage: page,
  }) => {
    await mockEventAndScouts(page);
    // Alex is waitlisted for Camping (period p1); Fishing is also p1, so it must
    // be blocked client-side even though the scout only holds a waitlist spot.
    await mockSchedule(page, [
      registration({
        scoutId: SCOUT_ALEX.scoutId,
        classId: 'cls-camping',
        status: 'waitlisted',
        enrolledAt: null,
        waitlistedAt: '2026-06-02T00:00:00.000Z',
      }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = classCard(page, 'Camping');
    await expect(campingCard.getByText('On waitlist')).toBeVisible();

    const fishingCard = classCard(page, 'Fishing');
    await expect(fishingCard.getByText('Conflicts with Camping in this period.')).toBeVisible();
    await expect(fishingCard.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  test("switching scouts shows each scout's own schedule", async ({ verifiedPage: page }) => {
    await mockEventAndScouts(page, [SCOUT_ALEX, SCOUT_JAMIE]);
    await mockSchedule(page, [
      registration({ scoutId: SCOUT_ALEX.scoutId, classId: 'cls-camping', status: 'enrolled' }),
      registration({ scoutId: SCOUT_JAMIE.scoutId, classId: 'cls-fishing', status: 'enrolled' }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = classCard(page, 'Camping');
    const fishingCard = classCard(page, 'Fishing');

    // Alex is selected by default (first scout in the list).
    await expect(campingCard.getByRole('button', { name: 'Drop' })).toBeVisible();
    await expect(fishingCard.getByText('Conflicts with Camping in this period.')).toBeVisible();
    await expect(page.getByText('1/2 periods scheduled')).toBeVisible();

    // Switch to Jamie: same schedule payload, independently filtered client-side.
    await page.getByRole('button', { name: 'Jamie Scout' }).click();
    await expect(fishingCard.getByRole('button', { name: 'Drop' })).toBeVisible();
    await expect(campingCard.getByText('Conflicts with Fishing in this period.')).toBeVisible();
    await expect(page.getByText('1/2 periods scheduled')).toBeVisible();
  });
});
