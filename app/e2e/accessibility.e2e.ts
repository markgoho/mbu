import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import type { PublicUniversity } from '../src/lib/api-types/universities-api.types.js';
import { expect, test } from './fixtures/auth.fixture.js';

/**
 * A smoke check with axe on the two pages that a visitor with no account sees.
 * This is not the accessibility pass of the app: #102 owns that.
 */

// WCAG 2.2 AA. The `best-practice` rules of axe are not conformance failures, so they are off.
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const EVENT: PublicUniversity = {
  id: 'summer-2026',
  title: 'Summer 2026 MBU',
  timezone: 'America/Chicago',
  startDate: '2026-07-10',
  endDate: '2026-07-11',
  registrationOpensAt: null,
  registrationClosesAt: '2026-07-01T00:00:00.000Z',
  location: {
    name: 'Central High School',
    address: '100 Main St',
    city: 'Springfield',
    state: 'IL',
    zip: '62701',
  },
  periods: [
    {
      periodId: 'p1',
      label: 'Morning',
      startsAt: '2026-07-10T13:00:00.000Z',
      endsAt: '2026-07-10T15:00:00.000Z',
    },
  ],
  classes: [
    {
      classId: 'cls-camping',
      badgeSlug: 'camping',
      badgeTitle: 'Camping',
      eagleRequired: true,
      periodIds: ['p1'],
      room: 'Room A',
      notes: 'Bring a water bottle.',
      capacity: 10,
      enrolledCount: 10,
      seatsRemaining: 0,
      waitlistCount: 2,
      counselors: [{ displayName: 'Pat Counselor' }],
    },
  ],
};

async function violationsOf(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  // A scan that ran no rule also has no violation.
  expect(results.passes.length).toBeGreaterThan(0);
  return results.violations.map(
    (violation) => `${violation.id} (${violation.nodes.length}): ${violation.help}`,
  );
}

test('the sign-in page has no WCAG 2.2 AA violation that axe can find', async ({ page }) => {
  await page.goto('/sign-in');
  // The page is rendered in the browser: axe must not scan it before it is there.
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

  expect(await violationsOf(page)).toEqual([]);
});

test('the public event page has no WCAG 2.2 AA violation that axe can find', async ({ page }) => {
  await page.route(`**/api/universities/${EVENT.id}/public`, (route) =>
    route.fulfill({ json: EVENT }),
  );

  await page.goto(`/e/${EVENT.id}`);
  await expect(page.getByRole('heading', { name: EVENT.title })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in to register' })).toBeVisible();

  expect(await violationsOf(page)).toEqual([]);
});
