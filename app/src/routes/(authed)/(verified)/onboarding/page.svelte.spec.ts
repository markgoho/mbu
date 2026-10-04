import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import type { OnboardingRequest } from '#lib/api-types/users-api.types.js';
import { ApiError } from '#lib/api.js';
import type { Fetcher } from '#lib/fetcher.js';
import { identity } from '../identityFixture.js';
import Page from './+page.svelte';

const { sessionMock, goto } = vi.hoisted(() => ({
  sessionMock: {
    completeOnboarding: vi.fn<(fetcher: Fetcher, request: OnboardingRequest) => Promise<void>>(),
  },
  goto: vi.fn<(url: string, options?: { refreshAll?: boolean }) => Promise<void>>(),
}));
vi.mock('#lib/session.svelte.js', () => sessionMock);
vi.mock('$app/navigation', () => ({ goto }));

interface SetupOptions {
  /**
  The name of the account at sign-in (a Google account has one, an email account has none).
  */
  displayName?: string;
  /**
  The error that the save of the details rejects with.
  */
  saveError?: Error;
}

async function setup({ displayName = '', saveError }: SetupOptions = {}) {
  goto.mockReset();
  goto.mockResolvedValue();
  sessionMock.completeOnboarding.mockReset();
  sessionMock.completeOnboarding.mockImplementation(() =>
    saveError ? Promise.reject(saveError) : Promise.resolve(),
  );

  const identityWithName = { ...identity, displayName };
  await render(Page, {
    data: { auth: { status: 'signed-in', session: identityWithName }, identity: identityWithName },
  });

  return {
    nameInput: page.getByLabelText('Your name'),
    termsCheckbox: page.getByRole('checkbox', {
      name: 'I agree to the Terms and Privacy Policy',
    }),
    submitButton: page.getByRole('button', { name: 'Continue' }),
  };
}

describe('onboarding page', () => {
  it('starts with the name of the account', async () => {
    const { nameInput } = await setup({ displayName: 'Pat Parent' });

    await expect.element(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect.element(nameInput).toHaveValue('Pat Parent');
  });

  it('saves the name and the acceptance, and then goes to the app home', async () => {
    const { nameInput, termsCheckbox, submitButton } = await setup();

    await nameInput.fill('  Pat Parent ');
    await termsCheckbox.click();
    await submitButton.click();

    await expect.poll(() => goto).toHaveBeenCalledExactlyOnceWith('/', { refreshAll: true });
    expect(sessionMock.completeOnboarding).toHaveBeenCalledExactlyOnceWith(expect.any(Function), {
      displayName: 'Pat Parent',
      acceptedTerms: true,
    });
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('does not save when the name is empty and the terms are not accepted', async () => {
    const { submitButton } = await setup();

    await submitButton.click();

    await expect.element(page.getByText('Please enter your name.')).toBeVisible();
    await expect
      .element(page.getByText('You must accept the Terms and Privacy Policy.'))
      .toBeVisible();
    expect(sessionMock.completeOnboarding).not.toHaveBeenCalled();
  });

  it('does not save when the terms are not accepted', async () => {
    const { nameInput, submitButton } = await setup();

    await nameInput.fill('Pat Parent');
    await submitButton.click();

    await expect
      .element(page.getByText('You must accept the Terms and Privacy Policy.'))
      .toBeVisible();
    await expect.element(page.getByText('Please enter your name.')).not.toBeInTheDocument();
    expect(sessionMock.completeOnboarding).not.toHaveBeenCalled();
  });

  it('shows an error and stays on the page when the save fails', async () => {
    const { termsCheckbox, submitButton } = await setup({
      displayName: 'Pat Parent',
      saveError: new ApiError(400, {
        code: 'INVALID_ARGUMENT',
        message: 'displayName is required',
      }),
    });

    await termsCheckbox.click();
    await submitButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Could not save your details. Please try again.');
    expect(goto).not.toHaveBeenCalled();
    await expect.element(submitButton).toBeEnabled();
  });

  it('shows the message of a field when the user leaves it empty', async () => {
    const { nameInput, termsCheckbox } = await setup();

    await nameInput.click();
    await termsCheckbox.click();

    await expect.element(page.getByText('Please enter your name.')).toBeVisible();
  });

  it('links to the terms and to the privacy policy', async () => {
    await setup();

    await expect
      .element(page.getByRole('link', { name: 'Terms' }))
      .toHaveAttribute('href', '/terms');
    await expect
      .element(page.getByRole('link', { name: 'Privacy Policy' }))
      .toHaveAttribute('href', '/privacy');
  });
});
