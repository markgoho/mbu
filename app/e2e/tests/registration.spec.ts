import type {
  Period,
  PublicClass,
  PublicUniversity,
} from '../../src/app/api-types/universities-api.types';
import type {
  RegistrationResponse,
  ScheduleResponse,
} from '../../src/app/api-types/registrations-api.types';
import type { ScoutListResponse } from '../../src/app/api-types/users-api.types';
import { expect, test } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';

/**
 * Parent registration flow, fully mocked except the Auth emulator. Mirrors
 * home.spec.ts's use of the verifiedPage fixture, then layers route mocks for
 * the public event read, the schedule read, and register/cancel writes.
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
  const cls = [CLASS_CAMPING, CLASS_FISHING, CLASS_COOKING].find(
    (c) => c.classId === overrides.classId,
  )!;
  return {
    universityId: UNIVERSITY_ID,
    status: 'enrolled',
    periodIds: cls.periodIds,
    badgeSlug: cls.badgeSlug,
    badgeTitle: cls.badgeTitle,
    waitlistedAt: null,
    enrolledAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Wires the always-on mocks (public event + scout list) shared by every test. */
async function mockEventAndScouts(
  page: Page,
  scouts: ScoutListResponse['scouts'] = [SCOUT_ALEX],
): Promise<void> {
  await page.route(`**/api/universities/${UNIVERSITY_ID}/public`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildEvent()),
    }),
  );
  await page.route('**/api/users/me/scouts', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ scouts } satisfies ScoutListResponse),
    }),
  );
}

/**
 * Mocks the schedule GET with a mutable backing array so register/cancel
 * mocks can push/remove entries and have the next reload reflect them -
 * mirrors how the real API would behave without needing a Firestore emulator.
 */
function mockSchedule(page: Page, initial: RegistrationResponse[] = []) {
  const registrations = [...initial];
  page.route(`**/api/registrations/${UNIVERSITY_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ registrations } satisfies ScheduleResponse),
    }),
  );
  return registrations;
}

test.describe('parent registration flow', () => {
  test('enroll hits class_full, joins waitlist, then drops', async ({ verifiedPage: page }) => {
    await mockEventAndScouts(page);
    const registrations = mockSchedule(page);

    let registerAttempts = 0;
    await page.route(`**/api/registrations/${UNIVERSITY_ID}/cls-cooking`, (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      registerAttempts += 1;
      if (registerAttempts === 1) {
        return route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'This class is full.', code: 'class_full' }),
        });
      }
      const reg = registration({
        scoutId: SCOUT_ALEX.scoutId,
        classId: 'cls-cooking',
        status: 'waitlisted',
        enrolledAt: null,
        waitlistedAt: '2026-06-02T00:00:00.000Z',
      });
      registrations.push(reg);
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(reg),
      });
    });
    await page.route(
      `**/api/registrations/${UNIVERSITY_ID}/cls-cooking/${SCOUT_ALEX.scoutId}`,
      (route) => {
        if (route.request().method() !== 'DELETE') return route.fallback();
        registrations.splice(
          registrations.findIndex((r) => r.classId === 'cls-cooking'),
          1,
        );
        return route.fulfill({ status: 204, body: '' });
      },
    );

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const cookingCard = page.locator('.register__class-card', { hasText: 'Cooking' });
    await expect(cookingCard.getByRole('button', { name: 'Register' })).toBeVisible();

    // Consent gates registration for the selected scout — accept before registering.
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
    mockSchedule(page, [
      registration({ scoutId: SCOUT_ALEX.scoutId, classId: 'cls-camping', status: 'enrolled' }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = page.locator('.register__class-card', { hasText: 'Camping' });
    await expect(campingCard.getByRole('button', { name: 'Drop' })).toBeVisible();

    const fishingCard = page.locator('.register__class-card', { hasText: 'Fishing' });
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
    mockSchedule(page, [
      registration({
        scoutId: SCOUT_ALEX.scoutId,
        classId: 'cls-camping',
        status: 'waitlisted',
        enrolledAt: null,
        waitlistedAt: '2026-06-02T00:00:00.000Z',
      }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = page.locator('.register__class-card', { hasText: 'Camping' });
    await expect(campingCard.getByText('On waitlist')).toBeVisible();

    const fishingCard = page.locator('.register__class-card', { hasText: 'Fishing' });
    await expect(fishingCard.getByText('Conflicts with Camping in this period.')).toBeVisible();
    await expect(fishingCard.getByRole('button', { name: 'Register' })).toBeDisabled();
  });

  test("switching scouts shows each scout's own schedule", async ({ verifiedPage: page }) => {
    await mockEventAndScouts(page, [SCOUT_ALEX, SCOUT_JAMIE]);
    mockSchedule(page, [
      registration({ scoutId: SCOUT_ALEX.scoutId, classId: 'cls-camping', status: 'enrolled' }),
      registration({ scoutId: SCOUT_JAMIE.scoutId, classId: 'cls-fishing', status: 'enrolled' }),
    ]);

    await page.goto(`/e/${UNIVERSITY_ID}/register`);

    const campingCard = page.locator('.register__class-card', { hasText: 'Camping' });
    const fishingCard = page.locator('.register__class-card', { hasText: 'Fishing' });

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
