import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { UniversityResponse } from '#lib/api-types/universities-api.types.js';
import { ApiError } from '#lib/api.js';
import UniversityForm, { type UniversityFormValues } from './UniversityForm.svelte';

const springMbu: UniversityResponse = {
  id: 'uni1',
  title: 'Spring MBU',
  status: 'draft',
  timezone: 'America/Chicago',
  startDate: '2026-06-01T12:00:00.000Z',
  endDate: null,
  registrationOpensAt: null,
  registrationClosesAt: '2026-05-25T23:59:00.000Z',
  location: {
    name: 'Scout Hall',
    address: '1 Main St',
    city: 'Anytown',
    state: 'NY',
    zip: '12345',
  },
  createdByUid: 'u1',
  reviewNote: null,
  submittedAt: null,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

interface SetupOptions {
  initial?: UniversityResponse;
  readonly?: boolean;
  /**
  The result of the save of the caller. The default is a save that succeeds.
  */
  save?: (values: UniversityFormValues) => Promise<unknown>;
}

async function setup({ initial, readonly = false, save }: SetupOptions = {}) {
  const onSave = vi.fn(save ?? (() => Promise.resolve()));
  const { rerender } = await render(UniversityForm, { initial, readonly, onSave });

  return {
    onSave,
    rerender,
    saveButton: page.getByRole('button', { name: 'Save university' }),
    async fillRequiredFields() {
      await page.getByLabelText('Title').fill('  Fall MBU ');
      await page.getByLabelText('Event start').fill('2026-10-03T08:00');
      await page.getByLabelText('Registration closes').fill('2026-09-26T23:59');
      await page.getByLabelText('Venue name').fill('Camp Hall');
      await page.getByLabelText('Street address').fill('2 Oak Ave');
      await page.getByLabelText('City').fill('Springfield');
      await page.getByLabelText('State').fill('IL');
      await page.getByLabelText('ZIP').fill('62701');
    },
  };
}

describe('UniversityForm', () => {
  it('starts empty, with the default timezone', async () => {
    await setup();

    await expect.element(page.getByLabelText('Title')).toHaveValue('');
    await expect.element(page.getByLabelText('Timezone (IANA)')).toHaveValue('America/New_York');
  });

  it('gives the values to the caller, with trimmed text and UTC datetimes', async () => {
    const { onSave, saveButton, fillRequiredFields } = await setup();
    await fillRequiredFields();

    await saveButton.click();

    await expect.poll(() => onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith({
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
    } satisfies UniversityFormValues);
  });

  it('gives the optional datetimes when the user sets them', async () => {
    const { onSave, saveButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await page
      .getByLabelText('Event end (optional — leave blank for single-day)')
      .fill('2026-10-04T16:00');
    await page.getByLabelText('Registration opens (optional)').fill('2026-09-01T09:00');

    await saveButton.click();

    await expect.poll(() => onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        endDate: '2026-10-04T20:00:00.000Z',
        registrationOpensAt: '2026-09-01T13:00:00.000Z',
      }),
    );
  });

  it('does not save when a required field is empty', async () => {
    const { onSave, saveButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await page.getByLabelText('ZIP').fill('');

    await saveButton.click();

    await expect.element(saveButton).toBeEnabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('does not save a title of more than 120 characters', async () => {
    const { onSave, saveButton, fillRequiredFields } = await setup();
    await fillRequiredFields();
    await page.getByLabelText('Title').fill('x'.repeat(121));

    await saveButton.click();

    await expect.element(saveButton).toBeEnabled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the values of the university that it edits', async () => {
    await setup({ initial: springMbu });

    await expect.element(page.getByLabelText('Title')).toHaveValue('Spring MBU');
    await expect.element(page.getByLabelText('Timezone (IANA)')).toHaveValue('America/Chicago');
    await expect.element(page.getByLabelText('Event start')).toHaveValue('2026-06-01T08:00');
    await expect
      .element(page.getByLabelText('Event end (optional — leave blank for single-day)'))
      .toHaveValue('');
    await expect
      .element(page.getByLabelText('Registration closes'))
      .toHaveValue('2026-05-25T19:59');
    await expect.element(page.getByLabelText('Venue name')).toHaveValue('Scout Hall');
    await expect.element(page.getByLabelText('ZIP')).toHaveValue('12345');
  });

  it('shows the new values when the university changes', async () => {
    const { rerender } = await setup({ initial: springMbu });

    await rerender({ initial: { ...springMbu, title: 'Summer MBU' } });

    await expect.element(page.getByLabelText('Title')).toHaveValue('Summer MBU');
  });

  it('disables the fields and hides the save button when it is read-only', async () => {
    const { saveButton } = await setup({ initial: springMbu, readonly: true });

    await expect.element(page.getByLabelText('Title')).toBeDisabled();
    await expect.element(page.getByLabelText('Event start')).toBeDisabled();
    await expect.element(page.getByLabelText('ZIP')).toBeDisabled();
    await expect.element(saveButton).not.toBeInTheDocument();
  });

  it('shows Saving… and disables the button while the save is in progress', async () => {
    const pending = Promise.withResolvers<void>();
    const { saveButton } = await setup({ initial: springMbu, save: () => pending.promise });

    await saveButton.click();

    const savingButton = page.getByRole('button', { name: 'Saving…' });
    await expect.element(savingButton).toBeDisabled();

    pending.resolve();

    await expect.element(saveButton).toBeEnabled();
  });

  it('shows the message of the API when the save fails', async () => {
    const { saveButton } = await setup({
      initial: springMbu,
      save: () =>
        Promise.reject(
          new ApiError(409, { code: 'CONFLICT', message: 'Registration closes after the start' }),
        ),
    });

    await saveButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Registration closes after the start');
  });

  it('shows the message of each field of the API beside its control, and the message for the form', async () => {
    const { saveButton } = await setup({
      initial: springMbu,
      save: () =>
        Promise.reject(
          new ApiError(400, {
            code: 'INVALID_ARGUMENT',
            message: 'Check the University form.',
            details: {
              endDate: 'End the event after it starts.',
              'location.city': 'Enter the city.',
            },
          }),
        ),
    });

    await saveButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Check the University form.');
    await expect
      .element(page.getByLabelText(/Event end/))
      .toHaveAccessibleDescription('End the event after it starts.');
    await expect
      .element(page.getByLabelText('City'))
      .toHaveAccessibleDescription('Enter the city.');
    await expect.element(page.getByLabelText('City')).toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByLabelText('Title')).not.toHaveAttribute('aria-invalid');
  });

  it('removes the messages of the fields when the next save succeeds', async () => {
    let attempts = 0;
    const { saveButton } = await setup({
      initial: springMbu,
      save: () => {
        attempts += 1;
        return attempts === 1
          ? Promise.reject(
              new ApiError(400, {
                code: 'INVALID_ARGUMENT',
                message: 'Check the University form.',
                details: { 'location.city': 'Enter the city.' },
              }),
            )
          : Promise.resolve();
      },
    });
    await saveButton.click();
    await expect.element(page.getByText('Enter the city.')).toBeVisible();

    await saveButton.click();

    await expect.element(page.getByText('Enter the city.')).not.toBeInTheDocument();
    await expect.element(page.getByLabelText('City')).not.toHaveAccessibleDescription();
  });

  it('shows a general message when the save fails with no API message', async () => {
    const { saveButton } = await setup({
      initial: springMbu,
      save: () => Promise.reject(new TypeError('Failed to fetch')),
    });

    await saveButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not save the university.');
  });
});
