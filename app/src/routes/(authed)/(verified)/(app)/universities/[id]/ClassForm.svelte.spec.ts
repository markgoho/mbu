import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type {
  BadgeCatalogEntry,
  ClassCreateRequest,
  ClassPatchRequest,
  ClassResponse,
  Period,
} from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import ClassForm from './ClassForm.svelte';

const badges: BadgeCatalogEntry[] = [
  { slug: 'archery', title: 'Archery', eagleRequired: false },
  { slug: 'camping', title: 'Camping', eagleRequired: true },
];

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

const campingClass: ClassResponse = {
  classId: 'cls1',
  badgeSlug: 'camping',
  badgeTitle: 'Camping',
  eagleRequired: true,
  periodIds: ['p2'],
  capacity: 12,
  enrolledCount: 0,
  waitlistCount: 0,
  room: 'Room A',
  notes: 'Bring a tent',
  counselors: [
    {
      uid: 'u1',
      displayName: 'Casey Chancellor',
      bsaId: '12345',
      disclaimerAcceptedAt: '2026-07-01T00:00:00.000Z',
      disclaimerVersion: '2026-07-03',
    },
  ],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

interface SetupOptions {
  periods?: Period[];
  editing?: ClassResponse;
  /**
  The error that the save of the caller rejects with. The default is a save that succeeds.
  */
  saveError?: Error;
}

async function setup({ periods = [morning, afternoon], editing, saveError }: SetupOptions = {}) {
  const save = () => (saveError ? Promise.reject(saveError) : Promise.resolve());
  const onCreate = vi.fn<(body: ClassCreateRequest) => Promise<void>>(save);
  const onUpdate = vi.fn<(classId: string, body: ClassPatchRequest) => Promise<void>>(save);
  const onDismiss = vi.fn<() => void>();
  const { rerender } = await render(ClassForm, {
    periods,
    badges,
    editing,
    counselorName: 'Casey Chancellor',
    onCreate,
    onUpdate,
    onDismiss,
  });

  const disclaimer = page.getByLabelText(/credentials have not been verified by Scouting America/);
  // `exact`: the disclaimer text also contains "merit badge".
  const badge = page.getByLabelText('Merit badge', { exact: true });
  return {
    onCreate,
    onUpdate,
    onDismiss,
    rerender,
    disclaimer,
    badge,
    capacity: page.getByLabelText('Capacity'),
    bsaId: page.getByLabelText('BSA member ID'),
    addButton: page.getByRole('button', { name: 'Add class' }),
    updateButton: page.getByRole('button', { name: 'Update class' }),
    /**
    Fills each field that a new class requires.
    */
    async fillRequiredFields() {
      await badge.selectOptions('camping');
      await page.getByLabelText('Morning').click();
      await page.getByLabelText('BSA member ID').fill(' 12345 ');
      await disclaimer.click();
    },
  };
}

describe('ClassForm', () => {
  it('offers the badges, the periods and the counselor fields for a new class', async () => {
    const { badge, capacity } = await setup();

    await expect.element(badge).toHaveValue('');
    await expect.element(page.getByRole('option', { name: 'Archery' })).toBeInTheDocument();
    await expect
      .element(page.getByRole('option', { name: 'Camping (Eagle required)' }))
      .toBeInTheDocument();
    await expect.element(page.getByLabelText('Morning')).not.toBeChecked();
    await expect.element(page.getByLabelText('Afternoon')).not.toBeChecked();
    await expect.element(capacity).toHaveValue(20);
    await expect.element(page.getByText('Name: Casey Chancellor')).toBeVisible();
  });

  it('tells the chancellor to add periods when the university has none', async () => {
    await setup({ periods: [] });

    await expect.element(page.getByText('Add periods before creating classes.')).toBeVisible();
  });

  it('gives the new class to the caller and then closes', async () => {
    const { onCreate, onUpdate, onDismiss, capacity, addButton, fillRequiredFields } =
      await setup();
    await fillRequiredFields();
    await page.getByLabelText('Afternoon').click();
    await capacity.fill('15');
    await page.getByLabelText('Room (optional)').fill('Room B');
    await page.getByLabelText('Notes (optional)').fill('Bring water');

    await addButton.click();

    await expect.poll(() => onDismiss).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledExactlyOnceWith({
      badgeSlug: 'camping',
      periodIds: ['p1', 'p2'],
      capacity: 15,
      room: 'Room B',
      notes: 'Bring water',
      counselor: { bsaId: '12345', acceptDisclaimer: true },
    });
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('gives null for a room and for notes that are empty', async () => {
    const { onCreate, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();

    await addButton.click();

    await expect.poll(() => onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ capacity: 20, room: null, notes: null }),
    );
  });

  it('removes a period from the class when the user clears its checkbox', async () => {
    const { onCreate, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await page.getByLabelText('Afternoon').click();
    await page.getByLabelText('Morning').click();

    await addButton.click();

    await expect.poll(() => onCreate).toHaveBeenCalledOnce();
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ periodIds: ['p2'] }));
  });

  it('does not save a class with no badge', async () => {
    const { onCreate, badge, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await badge.selectOptions('');

    await addButton.click();

    await expect.element(addButton).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not save a class with no BSA member ID', async () => {
    const { onCreate, bsaId, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await bsaId.fill('');

    await addButton.click();

    await expect.element(addButton).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('does not save a class when the counselor did not accept the disclaimer', async () => {
    const { onCreate, disclaimer, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await disclaimer.click();

    await addButton.click();

    await expect.element(addButton).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it.for([0, 201])('does not save a class with a capacity of %i', async (value) => {
    const { onCreate, capacity, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await capacity.fill(String(value));

    await addButton.click();

    await expect.element(addButton).toBeEnabled();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('asks for a period when none is selected', async () => {
    const { onCreate, addButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await page.getByLabelText('Morning').click();

    await addButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Select at least one period.');
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows the values of the class that it edits, with no counselor fields', async () => {
    const { badge, capacity, bsaId, disclaimer, updateButton } = await setup({
      editing: campingClass,
    });

    await expect.element(badge).toHaveValue('camping');
    await expect.element(page.getByLabelText('Morning')).not.toBeChecked();
    await expect.element(page.getByLabelText('Afternoon')).toBeChecked();
    await expect.element(capacity).toHaveValue(12);
    await expect.element(page.getByLabelText('Room (optional)')).toHaveValue('Room A');
    await expect.element(page.getByLabelText('Notes (optional)')).toHaveValue('Bring a tent');
    await expect.element(bsaId).not.toBeInTheDocument();
    await expect.element(disclaimer).not.toBeInTheDocument();
    await expect.element(updateButton).toBeVisible();
  });

  it('gives the changes of an edited class to the caller and then closes', async () => {
    const { onCreate, onUpdate, onDismiss, capacity, updateButton } = await setup({
      editing: campingClass,
    });
    await capacity.fill('30');
    await page.getByLabelText('Room (optional)').fill('');

    await updateButton.click();

    await expect.poll(() => onDismiss).toHaveBeenCalledOnce();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('cls1', {
      badgeSlug: 'camping',
      periodIds: ['p2'],
      capacity: 30,
      room: null,
      notes: 'Bring a tent',
    });
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('shows the values of a different class when the user edits that one', async () => {
    const { rerender, badge, capacity } = await setup({ editing: campingClass });

    await rerender({
      editing: { ...campingClass, classId: 'cls2', badgeSlug: 'archery', capacity: 8 },
    });

    await expect.element(badge).toHaveValue('archery');
    await expect.element(capacity).toHaveValue(8);
  });

  it('closes with no save when the user cancels', async () => {
    const { onCreate, onDismiss } = await setup();

    await page.getByRole('button', { name: 'Cancel' }).click();

    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('stays open and shows the message of the API when the save fails', async () => {
    const { onDismiss, addButton, fillRequiredFields } = await setup({
      saveError: new ApiError(409, { error: 'You already teach in this period' }),
    });
    await fillRequiredFields();

    await addButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('You already teach in this period');
    await expect.element(addButton).toBeEnabled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('shows a general message when the save fails with no API message', async () => {
    const { addButton, fillRequiredFields } = await setup({ saveError: new TypeError('offline') });
    await fillRequiredFields();

    await addButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not save the class.');
  });
});
