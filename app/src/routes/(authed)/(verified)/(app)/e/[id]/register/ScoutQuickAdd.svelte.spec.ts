import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { ScoutRequest } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import ScoutQuickAdd from './ScoutQuickAdd.svelte';

interface SetupOptions {
  /**
  The error that the add of the caller rejects with. The default is an add that succeeds.
  */
  addError?: Error;
}

async function setup({ addError }: SetupOptions = {}) {
  // The caller completes the add when the spec calls `finishAdd`.
  const pendingAdd = Promise.withResolvers<void>();
  const onAdd = vi.fn<(scout: ScoutRequest) => Promise<void>>(() => pendingAdd.promise);
  await render(ScoutQuickAdd, { onAdd });

  return {
    onAdd,
    finishAdd: () => (addError ? pendingAdd.reject(addError) : pendingAdd.resolve()),
    firstName: page.getByLabelText('First name'),
    lastName: page.getByLabelText('Last name'),
    addButton: page.getByRole('button', { name: 'Add scout' }),
  };
}

describe('ScoutQuickAdd', () => {
  it('gives the trimmed names of the scout to the caller', async () => {
    const { onAdd, firstName, lastName, addButton } = await setup();

    await firstName.fill(' Alex ');
    await lastName.fill(' Smith ');
    await addButton.click();

    expect(onAdd).toHaveBeenCalledExactlyOnceWith({ firstName: 'Alex', lastName: 'Smith' });
  });

  it('shows that the add is in progress, and then clears the fields', async () => {
    const { finishAdd, firstName, lastName, addButton } = await setup();
    await firstName.fill('Alex');
    await lastName.fill('Smith');

    await addButton.click();

    const busyButton = page.getByRole('button', { name: 'Adding…' });
    await expect.element(busyButton).toBeDisabled();

    finishAdd();

    await expect.element(addButton).toBeEnabled();
    await expect.element(firstName).toHaveValue('');
    await expect.element(lastName).toHaveValue('');
  });

  it.for([
    { missing: 'first name', first: '', last: 'Smith' },
    { missing: 'last name', first: 'Alex', last: '' },
    { missing: 'first name (only spaces)', first: ' ', last: 'Smith' },
  ])('does not add a scout with no $missing', async ({ first, last }) => {
    const { onAdd, firstName, lastName, addButton } = await setup();

    await firstName.fill(first);
    await lastName.fill(last);
    await addButton.click();

    expect(onAdd).not.toHaveBeenCalled();
    await expect.element(addButton).toBeEnabled();
  });

  it('shows the message of the API and the message of each field beside its control', async () => {
    const { finishAdd, firstName, lastName, addButton } = await setup({
      addError: new ApiError(400, {
        code: 'INVALID_ARGUMENT',
        message: 'Check the Scout form.',
        details: { lastName: 'Enter a last name of 100 characters or fewer.' },
      }),
    });
    await firstName.fill('Alex');
    await lastName.fill('Smith');

    await addButton.click();
    finishAdd();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Check the Scout form.');
    await expect
      .element(lastName)
      .toHaveAccessibleDescription('Enter a last name of 100 characters or fewer.');
    await expect.element(firstName).not.toHaveAccessibleDescription();
  });

  it('shows a fixed message and keeps the names when the add fails with no message of the API', async () => {
    const { finishAdd, firstName, lastName, addButton } = await setup({
      addError: new ApiError(500, { code: 'INTERNAL', message: 'Internal error' }),
    });
    await firstName.fill('Alex');
    await lastName.fill('Smith');

    await addButton.click();
    finishAdd();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not add this scout. Please try again.');
    await expect.element(addButton).toBeEnabled();
    await expect.element(firstName).toHaveValue('Alex');
    await expect.element(lastName).toHaveValue('Smith');
  });
});
