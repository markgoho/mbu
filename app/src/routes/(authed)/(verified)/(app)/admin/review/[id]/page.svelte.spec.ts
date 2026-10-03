import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { UniversityStatus } from '#lib/api-types/universities-api.types.js';
import type { BootstrapResponse } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import Page from './+page.svelte';
import { sampleDetail } from './reviewFixture.js';

const universities = vi.hoisted(() => ({
  approveUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<void>>(),
  rejectUniversity: vi.fn<(fetcher: Fetcher, id: string, note: string) => Promise<void>>(),
}));
const { goto } = vi.hoisted(() => ({
  goto: vi.fn<(url: string, options?: { refreshAll?: boolean }) => Promise<void>>(),
}));
vi.mock('#lib/universities.js', () => universities);
vi.mock('$app/navigation', () => ({ goto }));

const session: BootstrapResponse = {
  user: {
    uid: 'u1',
    displayName: 'Sam Superadmin',
    email: 'sam@example.com',
    phone: null,
    acceptedTermsAt: '2026-01-01T00:00:00.000Z',
    acceptedPrivacyAt: '2026-01-01T00:00:00.000Z',
    acceptedPolicyVersion: '1',
    rosterExportAckAt: null,
  },
  needsConsent: false,
};

interface SetupOptions {
  status?: UniversityStatus;
  /**
  The error that the approve request rejects with. The default is a request that succeeds.
  */
  approveError?: Error;
  /**
  The error that the reject request rejects with. The default is a request that succeeds.
  */
  rejectError?: Error;
}

async function setup({ status = 'submitted', approveError, rejectError }: SetupOptions = {}) {
  universities.approveUniversity.mockReset();
  universities.approveUniversity.mockImplementation(() =>
    approveError ? Promise.reject(approveError) : Promise.resolve(),
  );
  universities.rejectUniversity.mockReset();
  universities.rejectUniversity.mockImplementation(() =>
    rejectError ? Promise.reject(rejectError) : Promise.resolve(),
  );
  goto.mockReset();
  goto.mockResolvedValue();

  await render(Page, {
    data: {
      session,
      university: { ...sampleDetail.university, status },
      classes: sampleDetail.classes,
    },
  });

  return {
    approveButton: page.getByRole('button', { name: 'Approve' }),
    rejectButton: page.getByRole('button', { name: 'Reject', exact: true }),
    noteField: page.getByLabelText('Reason for rejection'),
    submitRejectionButton: page.getByRole('button', { name: 'Submit rejection' }),
  };
}

describe('review detail page', () => {
  it('renders the event and its classes for a submitted event', async () => {
    const { approveButton, rejectButton } = await setup();

    await expect.element(page.getByRole('heading', { name: 'Spring MBU' })).toBeVisible();
    await expect.element(page.getByText('submitted', { exact: true })).toBeVisible();
    await expect.element(page.getByRole('listitem')).toHaveTextContent('Camping · cap 20');
    await expect.element(approveButton).toBeVisible();
    await expect.element(rejectButton).toBeVisible();
  });

  it('shows the location, the timezone and the number of classes', async () => {
    await setup();

    await expect.element(page.getByText('Scout Hall, Anytown, NY')).toBeVisible();
    await expect.element(page.getByText('America/New_York')).toBeVisible();
    await expect.element(page.getByRole('definition').nth(2)).toHaveTextContent('1');
  });

  it('links back to the queue', async () => {
    await setup();

    await expect
      .element(page.getByRole('link', { name: '← Back to queue' }))
      .toHaveAttribute('href', '/admin/review');
  });

  it('approves and navigates back to the queue', async () => {
    const { approveButton } = await setup();

    await approveButton.click();

    await expect
      .poll(() => goto)
      .toHaveBeenCalledExactlyOnceWith('/admin/review', { refreshAll: true });
    expect(universities.approveUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
    );
  });

  it('shows an error and stays on the page when approval fails', async () => {
    const { approveButton } = await setup({ approveError: new TypeError('offline') });

    await approveButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not approve this event.');
    await expect.element(approveButton).toBeEnabled();
    expect(goto).not.toHaveBeenCalled();
  });

  it('shows the message of the app when the university cannot move to published now', async () => {
    const { approveButton } = await setup({
      approveError: new ApiError(409, {
        code: 'FAILED_PRECONDITION',
        message: 'Cannot transition from published to published',
      }),
    });

    await approveButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent(
        'The university cannot make that change in its current status. Reload the page to see its status.',
      );
  });

  it('shows the message of the API for the note beside the note field', async () => {
    const { rejectButton, noteField, submitRejectionButton } = await setup({
      rejectError: new ApiError(400, {
        code: 'INVALID_ARGUMENT',
        message: 'Enter a review note of 1 to 2000 characters.',
        details: { note: 'Enter a review note of 1 to 2000 characters.' },
      }),
    });

    await rejectButton.click();
    await noteField.fill('Too long');
    await submitRejectionButton.click();

    await expect
      .element(noteField)
      .toHaveAccessibleDescription('Enter a review note of 1 to 2000 characters.');
  });

  it('rejects with a note and navigates back to the queue', async () => {
    const { rejectButton, noteField, submitRejectionButton } = await setup();

    await rejectButton.click();
    await noteField.fill('  Missing counselor disclaimers ');
    await submitRejectionButton.click();

    await expect
      .poll(() => goto)
      .toHaveBeenCalledExactlyOnceWith('/admin/review', { refreshAll: true });
    expect(universities.rejectUniversity).toHaveBeenCalledExactlyOnceWith(
      expect.any(Function),
      'uni1',
      'Missing counselor disclaimers',
    );
  });

  it('disables the rejection submit button until a note is entered', async () => {
    const { rejectButton, noteField, submitRejectionButton } = await setup();

    await rejectButton.click();

    await expect.element(submitRejectionButton).toBeDisabled();
    await expect.element(rejectButton).not.toBeInTheDocument();

    await noteField.fill(' ');
    await expect.element(submitRejectionButton).toBeDisabled();

    await noteField.fill('Missing counselor disclaimers');
    await expect.element(submitRejectionButton).toBeEnabled();
  });

  it('shows an error and stays on the page when the rejection fails', async () => {
    const { rejectButton, noteField, submitRejectionButton } = await setup({
      rejectError: new TypeError('offline'),
    });

    await rejectButton.click();
    await noteField.fill('Missing counselor disclaimers');
    await submitRejectionButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Could not reject this event.');
    await expect.element(noteField).toHaveValue('Missing counselor disclaimers');
    expect(goto).not.toHaveBeenCalled();
  });

  it('shows no approve and no reject action for an event that is not submitted', async () => {
    const { approveButton, rejectButton } = await setup({ status: 'published' });

    await expect.element(page.getByText('published', { exact: true })).toBeVisible();
    await expect.element(approveButton).not.toBeInTheDocument();
    await expect.element(rejectButton).not.toBeInTheDocument();
  });
});
