import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const { sessionMock, goto } = vi.hoisted(() => ({
  sessionMock: {
    resendEmailVerification: vi.fn<() => Promise<void>>(),
    isEmailVerifiedAfterReload: vi.fn<() => Promise<boolean>>(),
  },
  goto: vi.fn<(url: string) => Promise<void>>(),
}));
vi.mock('#lib/session.svelte.js', () => sessionMock);
vi.mock('$app/navigation', () => ({ goto }));

interface SetupOptions {
  /**
  The user opened the link of the verification email before the reload of the user.
  */
  isVerifiedAfterReload?: boolean;
  /**
  The error that the resend of the email rejects with.
  */
  resendError?: Error;
  /**
  The error that the reload of the user rejects with.
  */
  reloadError?: Error;
}

async function setup({
  isVerifiedAfterReload = false,
  resendError,
  reloadError,
}: SetupOptions = {}) {
  goto.mockReset();
  goto.mockResolvedValue();
  sessionMock.resendEmailVerification.mockReset();
  sessionMock.resendEmailVerification.mockImplementation(() =>
    resendError ? Promise.reject(resendError) : Promise.resolve(),
  );
  sessionMock.isEmailVerifiedAfterReload.mockReset();
  sessionMock.isEmailVerifiedAfterReload.mockImplementation(() =>
    reloadError ? Promise.reject(reloadError) : Promise.resolve(isVerifiedAfterReload),
  );

  await render(Page, { data: { auth: { status: 'unverified', email: 'parent@example.com' } } });

  return {
    resendButton: page.getByRole('button', { name: 'Resend email' }),
    continueButton: page.getByRole('button', { name: "I've verified — continue" }),
  };
}

describe('verify-email page', () => {
  it('shows the address that the verification link went to', async () => {
    await setup();

    await expect.element(page.getByRole('heading', { name: 'Verify your email' })).toBeVisible();
    await expect.element(page.getByText('parent@example.com')).toBeVisible();
  });

  it('sends the verification email again', async () => {
    const { resendButton } = await setup();

    await resendButton.click();

    await expect
      .element(page.getByRole('status'))
      .toHaveTextContent('Verification email sent. Check your inbox.');
    expect(sessionMock.resendEmailVerification).toHaveBeenCalledOnce();
  });

  it('shows the message of a resend that failed', async () => {
    const { resendButton } = await setup({
      resendError: new Error('Too many failed attempts. Please try again later.'),
    });

    await resendButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Too many failed attempts. Please try again later.');
    await expect.element(page.getByRole('status')).not.toBeInTheDocument();
  });

  it('goes to the app home when the email is verified', async () => {
    const { continueButton } = await setup({ isVerifiedAfterReload: true });

    await continueButton.click();

    await expect.poll(() => goto).toHaveBeenCalledExactlyOnceWith('/');
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('stays on the page with a message when the email is not verified yet', async () => {
    const { continueButton } = await setup();

    await continueButton.click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Email is not verified yet. Please try again.');
    expect(sessionMock.isEmailVerifiedAfterReload).toHaveBeenCalledOnce();
    expect(goto).not.toHaveBeenCalled();
  });

  it('shows the message of a reload that failed', async () => {
    const { continueButton } = await setup({
      reloadError: new Error('Failed to reload user data.'),
    });

    await continueButton.click();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Failed to reload user data.');
    expect(goto).not.toHaveBeenCalled();
  });
});
