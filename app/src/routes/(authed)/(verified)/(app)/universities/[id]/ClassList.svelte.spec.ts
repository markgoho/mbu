import { describe, expect, it, onTestFinished, vi } from 'vitest';
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
import ClassList from './ClassList.svelte';

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

const campingClass: ClassResponse = {
  classId: 'cls1',
  badgeSlug: 'camping',
  badgeTitle: 'Camping',
  eagleRequired: true,
  periodIds: ['p1'],
  capacity: 12,
  enrolledCount: 0,
  waitlistCount: 0,
  room: 'Room A',
  notes: null,
  counselors: [],
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};
const archeryClass: ClassResponse = {
  ...campingClass,
  classId: 'cls2',
  badgeSlug: 'archery',
  badgeTitle: 'Archery',
  eagleRequired: false,
  capacity: 8,
  room: null,
};

interface SetupOptions {
  classes?: ClassResponse[];
  readonly?: boolean;
  /**
  The answer of the user to the confirm question of a deletion.
  */
  isConfirmed?: boolean;
  /**
  The error that the deletion of the caller rejects with. The default is a deletion that succeeds.
  */
  deleteError?: Error;
}

async function setup({
  classes = [campingClass, archeryClass],
  readonly = false,
  isConfirmed = true,
  deleteError,
}: SetupOptions = {}) {
  const confirmSpy = vi.spyOn(globalThis, 'confirm').mockReturnValue(isConfirmed);
  onTestFinished(() => confirmSpy.mockRestore());

  const onCreate = vi.fn<(body: ClassCreateRequest) => Promise<void>>(() => Promise.resolve());
  const onUpdate = vi.fn<(classId: string, body: ClassPatchRequest) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const onDelete = vi.fn<(classId: string) => Promise<void>>(() =>
    deleteError ? Promise.reject(deleteError) : Promise.resolve(),
  );
  await render(ClassList, {
    periods: [morning],
    classes,
    badges,
    counselorName: 'Casey Chancellor',
    readonly,
    onCreate,
    onUpdate,
    onDelete,
  });

  return {
    confirmSpy,
    onCreate,
    onUpdate,
    onDelete,
    items: page.getByRole('listitem'),
    // `exact`: the disclaimer text of the form also contains "merit badge".
    badgeField: page.getByLabelText('Merit badge', { exact: true }),
    addButton: page.getByRole('button', { name: 'Add class' }),
    editButtons: page.getByRole('button', { name: 'Edit' }),
    deleteButtons: page.getByRole('button', { name: 'Delete' }),
  };
}

describe('ClassList', () => {
  it('lists each class with its capacity, its number of periods and its room', async () => {
    const { items, badgeField } = await setup();

    await expect.element(page.getByRole('heading', { name: 'Classes' })).toBeVisible();
    await expect.element(items).toHaveLength(2);
    await expect.element(items.nth(0)).toHaveTextContent('Camping · cap 12 · 1 period(s) · Room A');
    await expect.element(items.nth(1)).toHaveTextContent('Archery · cap 8 · 1 period(s)');
    await expect.element(items.nth(1)).not.toHaveTextContent('1 period(s) ·');
    await expect.element(badgeField).not.toBeInTheDocument();
  });

  it('shows a message when the university has no classes', async () => {
    await setup({ classes: [] });

    await expect.element(page.getByText('No classes yet.')).toBeVisible();
  });

  it('opens an empty form for a new class, and gives the class to the caller', async () => {
    const { onCreate, badgeField, addButton } = await setup({ classes: [] });

    await addButton.click();

    await expect.element(badgeField).toHaveValue('');
    await expect.element(page.getByText('No classes yet.')).not.toBeInTheDocument();
    // The only "Add class" button is now the submit button of the form.
    await expect.element(addButton).toHaveLength(1);

    await badgeField.selectOptions('archery');
    await page.getByLabelText('Morning').click();
    await page.getByLabelText('BSA member ID').fill('12345');
    await page.getByLabelText(/credentials have not been verified/).click();
    await addButton.click();

    await expect.element(badgeField).not.toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledExactlyOnceWith({
      badgeSlug: 'archery',
      periodIds: ['p1'],
      capacity: 20,
      room: null,
      notes: null,
      counselor: { bsaId: '12345', acceptDisclaimer: true },
    });
  });

  it('opens the form with the values of the class to edit, and gives the changes to the caller', async () => {
    const { onUpdate, badgeField, editButtons } = await setup();

    await editButtons.nth(1).click();

    await expect.element(badgeField).toHaveValue('archery');

    await page.getByLabelText('Capacity').fill('9');
    await page.getByRole('button', { name: 'Update class' }).click();

    await expect.element(badgeField).not.toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith('cls2', {
      badgeSlug: 'archery',
      periodIds: ['p1'],
      capacity: 9,
      room: null,
      notes: null,
    });
  });

  it('opens an empty form for a new class after an edit that the user cancelled', async () => {
    const { badgeField, addButton, editButtons } = await setup();
    await editButtons.nth(0).click();
    await expect.element(badgeField).toHaveValue('camping');

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect.element(badgeField).not.toBeInTheDocument();

    await addButton.click();

    await expect.element(badgeField).toHaveValue('');
  });

  it('deletes a class after the user confirms', async () => {
    const { confirmSpy, onDelete, deleteButtons } = await setup();

    await deleteButtons.nth(0).click();

    await expect.poll(() => onDelete).toHaveBeenCalledExactlyOnceWith('cls1');
    expect(confirmSpy).toHaveBeenCalledExactlyOnceWith('Delete Camping?');
  });

  it('does not delete a class when the user declines', async () => {
    const { onDelete, deleteButtons } = await setup({ isConfirmed: false });

    await deleteButtons.nth(0).click();

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('shows the message of the API when the deletion fails', async () => {
    const { deleteButtons } = await setup({
      deleteError: new ApiError(409, { error: 'Class has registrations' }),
    });

    await deleteButtons.nth(0).click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Class has registrations');
    await expect.element(deleteButtons.nth(0)).toBeEnabled();
  });

  it('shows a general message when the deletion fails with no API message', async () => {
    const { deleteButtons } = await setup({ deleteError: new TypeError('offline') });

    await deleteButtons.nth(0).click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not delete this class.');
  });

  it('hides all actions when it is read-only', async () => {
    const { items, addButton, editButtons, deleteButtons } = await setup({ readonly: true });

    await expect.element(items).toHaveLength(2);
    await expect.element(addButton).not.toBeInTheDocument();
    await expect.element(editButtons).toHaveLength(0);
    await expect.element(deleteButtons).toHaveLength(0);
  });
});
