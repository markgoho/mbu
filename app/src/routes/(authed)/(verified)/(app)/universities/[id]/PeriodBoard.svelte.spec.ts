import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { ClassResponse, Period, PeriodInput } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import PeriodBoard from './PeriodBoard.svelte';

const morning: Period = {
  periodId: 'p1',
  label: 'Morning',
  startsAt: '2026-06-01T12:00:00.000Z',
  endsAt: '2026-06-01T14:00:00.000Z',
};
const afternoon: Period = {
  periodId: 'p2',
  label: 'Afternoon',
  startsAt: '2026-06-01T17:00:00.000Z',
  endsAt: '2026-06-01T19:00:00.000Z',
};

const campingInMorning: ClassResponse = {
  classId: 'cls1',
  badgeSlug: 'camping',
  badgeTitle: 'Camping',
  eagleRequired: true,
  periodIds: ['p1'],
  capacity: 20,
  enrolledCount: 0,
  waitlistCount: 0,
  room: null,
  notes: null,
  counselors: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

interface SetupOptions {
  periods?: Period[];
  classes?: ClassResponse[];
  readonly?: boolean;
  /**
  The result of the save of the caller. The default is a save that succeeds.
  */
  save?: (periods: PeriodInput[]) => Promise<unknown>;
}

async function setup({
  periods = [morning, afternoon],
  classes = [],
  readonly = false,
  save,
}: SetupOptions = {}) {
  const onSave = vi.fn(save ?? (() => Promise.resolve()));
  const { rerender } = await render(PeriodBoard, { periods, classes, readonly, onSave });

  return {
    onSave,
    rerender,
    rows: page.getByRole('group'),
    labels: page.getByLabelText('Label'),
    starts: page.getByLabelText('Starts'),
    ends: page.getByLabelText('Ends'),
    removeButtons: page.getByRole('button', { name: 'Remove' }),
    addButton: page.getByRole('button', { name: 'Add period' }),
    saveButton: page.getByRole('button', { name: 'Save periods' }),
  };
}

describe('PeriodBoard', () => {
  it('shows one row for each period, with the times in the timezone of the browser', async () => {
    const { rows, labels, starts, ends } = await setup();

    await expect.element(rows).toHaveLength(2);
    await expect.element(labels.nth(0)).toHaveValue('Morning');
    await expect.element(starts.nth(0)).toHaveValue('2026-06-01T08:00');
    await expect.element(ends.nth(0)).toHaveValue('2026-06-01T10:00');
    await expect.element(labels.nth(1)).toHaveValue('Afternoon');
  });

  it('shows one empty row when the university has no periods', async () => {
    const { rows, labels } = await setup({ periods: [] });

    await expect.element(rows).toHaveLength(1);
    await expect.element(labels).toHaveValue('');
  });

  it('adds an empty row and removes a row', async () => {
    const { rows, labels, addButton, removeButtons } = await setup();

    await addButton.click();

    await expect.element(rows).toHaveLength(3);
    await expect.element(labels.nth(2)).toHaveValue('');

    await removeButtons.nth(0).click();

    await expect.element(rows).toHaveLength(2);
    await expect.element(labels.nth(0)).toHaveValue('Afternoon');
  });

  it('does not remove a period that a class uses', async () => {
    const { rows, removeButtons } = await setup({ classes: [campingInMorning] });

    await removeButtons.nth(0).click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('This period is assigned to a class. Remove or reassign the class first.');
    await expect.element(rows).toHaveLength(2);

    // A removal that is permitted clears the message.
    await removeButtons.nth(1).click();

    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
    await expect.element(rows).toHaveLength(1);
  });

  it('gives all periods to the caller, with the ID of each period that has one', async () => {
    const { onSave, labels, starts, ends, addButton, saveButton } = await setup({
      periods: [morning],
    });
    await addButton.click();
    await labels.nth(1).fill('  Evening ');
    await starts.nth(1).fill('2026-06-01T18:00');
    await ends.nth(1).fill('2026-06-01T20:00');

    await saveButton.click();

    await expect.poll(() => onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith([
      {
        periodId: 'p1',
        label: 'Morning',
        startsAt: '2026-06-01T12:00:00.000Z',
        endsAt: '2026-06-01T14:00:00.000Z',
      },
      {
        label: 'Evening',
        startsAt: '2026-06-01T22:00:00.000Z',
        endsAt: '2026-06-02T00:00:00.000Z',
      },
    ]);
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  it('does not save when a field of a row is empty', async () => {
    const { onSave, addButton, saveButton } = await setup();
    await addButton.click();

    await saveButton.click();

    await expect.element(saveButton).toBeEnabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('warns about periods that overlap, and saves them', async () => {
    const { onSave, starts, saveButton } = await setup();
    // The afternoon now starts before the morning ends.
    await starts.nth(1).fill('2026-06-01T09:00');

    await saveButton.click();

    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent('Periods "Morning" and "Afternoon" overlap in time.');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('shows the periods of the API again after a save, and keeps the overlap warning', async () => {
    const { rerender, labels, starts, saveButton } = await setup();
    await starts.nth(1).fill('2026-06-01T09:00');
    await saveButton.click();

    // The route loads the university again and gives the stored periods.
    await rerender({ periods: [{ ...morning, label: 'Early' }, afternoon] });

    await expect.element(labels.nth(0)).toHaveValue('Early');
    await expect.element(starts.nth(1)).toHaveValue('2026-06-01T13:00');
    await expect.element(page.getByRole('status')).toHaveTextContent('overlap in time.');
  });

  it('disables the fields and hides the actions when it is read-only', async () => {
    const { labels, starts, removeButtons, addButton, saveButton } = await setup({
      readonly: true,
    });

    await expect.element(labels.nth(0)).toBeDisabled();
    await expect.element(starts.nth(0)).toBeDisabled();
    await expect.element(removeButtons).toHaveLength(0);
    await expect.element(addButton).not.toBeInTheDocument();
    await expect.element(saveButton).not.toBeInTheDocument();
  });

  it('shows Saving… and disables the button while the save is in progress', async () => {
    const pending = Promise.withResolvers<void>();
    const { saveButton } = await setup({ save: () => pending.promise });

    await saveButton.click();

    await expect.element(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    pending.resolve();

    await expect.element(saveButton).toBeEnabled();
  });

  it('shows the message of the API, with the classes of the conflict, when the save fails', async () => {
    const { saveButton } = await setup({
      save: () =>
        Promise.reject(
          new ApiError(409, {
            error: 'Period is in use',
            details: { classes: [{ classId: 'cls1', title: 'Camping' }] },
          }),
        ),
    });

    await saveButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Period is in use (Camping)');
  });

  it('shows a general message when the save fails with no API message', async () => {
    const { saveButton } = await setup({ save: () => Promise.reject(new TypeError('offline')) });

    await saveButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not save periods.');
  });
});
