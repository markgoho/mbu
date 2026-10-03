import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type {
  UniversityCreateRequest,
  UniversityResponse,
} from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { IdempotencyKeys } from '#lib/idempotency.js';
import Page from './+page.svelte';

const { createUniversity, goto } = vi.hoisted(() => ({
  createUniversity:
    vi.fn<
      (
        fetcher: Fetcher,
        body: UniversityCreateRequest,
        keys: IdempotencyKeys,
      ) => Promise<UniversityResponse>
    >(),
  goto: vi.fn<(url: string) => Promise<void>>(),
}));
vi.mock('#lib/universities.js', () => ({ createUniversity }));
vi.mock('$app/navigation', () => ({ goto }));

const UUID_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/;

interface SetupOptions {
  /**
  The error that the create request rejects with. The default is a request that succeeds.
  */
  createError?: Error;
}

async function setup({ createError }: SetupOptions = {}) {
  createUniversity.mockReset();
  // The fake API: it stores the university with the ID that the client made.
  createUniversity.mockImplementation(async (_fetcher, body) => {
    if (createError) throw createError;
    return {
      ...body,
      endDate: body.endDate ?? null,
      registrationOpensAt: body.registrationOpensAt ?? null,
      status: 'draft',
      createdByUid: 'u1',
      reviewNote: null,
      submittedAt: null,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    };
  });
  goto.mockReset();
  goto.mockResolvedValue();

  await render(Page);

  return {
    async fillAndSave() {
      await page.getByLabelText('Title').fill('Fall MBU');
      await page.getByLabelText('Event start').fill('2026-10-03T08:00');
      await page.getByLabelText('Registration closes').fill('2026-09-26T23:59');
      await page.getByLabelText('Venue name').fill('Camp Hall');
      await page.getByLabelText('Street address').fill('2 Oak Ave');
      await page.getByLabelText('City').fill('Springfield');
      await page.getByLabelText('State').fill('IL');
      await page.getByLabelText('ZIP').fill('62701');
      await page.getByRole('button', { name: 'Save university' }).click();
    },
  };
}

describe('create university page', () => {
  it('shows the heading and the link back to the dashboard', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Create University' })).toBeVisible();
    await expect
      .element(page.getByRole('link', { name: '← Back to dashboard' }))
      .toHaveAttribute('href', '/universities');
  });

  it('creates the university with a new ID and opens its editor', async () => {
    const { fillAndSave } = await setup();

    await fillAndSave();

    await expect.poll(() => goto).toHaveBeenCalledOnce();
    expect(createUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      {
        id: expect.stringMatching(UUID_PATTERN),
        title: 'Fall MBU',
        timezone: 'America/New_York',
        startDate: '2026-10-03T12:00:00.000Z',
        endDate: null,
        registrationOpensAt: null,
        registrationClosesAt: '2026-09-27T03:59:00.000Z',
        location: {
          name: 'Camp Hall',
          address: '2 Oak Ave',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
        },
      },
      expect.any(IdempotencyKeys),
    );
    const createdId = createUniversity.mock.calls[0]?.[1].id;
    expect(goto).toHaveBeenCalledWith(`/universities/${createdId}`);
  });

  it('sends the same ID again when the user saves again after a network failure', async () => {
    const { fillAndSave } = await setup({ createError: new TypeError('Failed to fetch') });
    await fillAndSave();
    await expect.element(page.getByRole('alert')).toBeVisible();

    await page.getByRole('button', { name: 'Save university' }).click();

    await expect.poll(() => createUniversity.mock.calls.length).toBe(2);
    const [first, second] = createUniversity.mock.calls;
    expect(second?.[1].id).toBe(first?.[1].id);
    expect(second?.[2]).toBe(first?.[2]);
  });

  it('stays on the page and shows the message of the API when the create fails', async () => {
    const { fillAndSave } = await setup({
      createError: new ApiError(400, {
        code: 'INVALID_ARGUMENT',
        message: 'Registration must close before the event',
      }),
    });

    await fillAndSave();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Registration must close before the event');
    expect(goto).not.toHaveBeenCalled();
  });
});
