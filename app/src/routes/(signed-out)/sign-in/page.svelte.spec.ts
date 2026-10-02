import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { authErrorMessage } from '#lib/authErrorMessage.js';
import Page from './+page.svelte';

// The session module is the seam (#228, decision 7). It throws an `Error` with
// the translated message of the Firebase failure. `authErrorMessage.spec.ts`
// has the cases of the translation table.
const sessionMock = vi.hoisted(() => ({
  signInWithEmailPassword: vi.fn<(email: string, password: string) => Promise<void>>(),
  signUpWithEmailPassword: vi.fn<(email: string, password: string) => Promise<void>>(),
  signInWithGoogle: vi.fn<() => Promise<void>>(),
  completeGoogleRedirect: vi.fn<() => Promise<void>>(),
}));
vi.mock('#lib/session.svelte.js', () => sessionMock);

interface SetupOptions {
  /**
  The code of the Firebase failure that stops the email sign-in. The default is a sign-in that succeeds.
  */
  signInFailureCode?: string;
  /**
  The code of the Firebase failure of the Google redirect that the page completes at the start.
  */
  redirectFailureCode?: string;
  /**
  The Google sign-in cannot start.
  */
  isGoogleUnavailable?: boolean;
}

function rejectWithCode(code: string): Promise<never> {
  return Promise.reject(new Error(authErrorMessage({ code })));
}

async function fillCredentials(email = 'scout@example.com', password = 'secret123') {
  await page.getByLabelText('Email').fill(email);
  await page.getByLabelText('Password').fill(password);
}

async function setup({
  signInFailureCode,
  redirectFailureCode,
  isGoogleUnavailable = false,
}: SetupOptions = {}) {
  for (const mock of Object.values(sessionMock)) mock.mockReset();
  sessionMock.signInWithEmailPassword.mockImplementation(() =>
    signInFailureCode ? rejectWithCode(signInFailureCode) : Promise.resolve(),
  );
  sessionMock.signUpWithEmailPassword.mockResolvedValue();
  sessionMock.signInWithGoogle.mockImplementation(() =>
    isGoogleUnavailable ? rejectWithCode('auth/network-request-failed') : Promise.resolve(),
  );
  sessionMock.completeGoogleRedirect.mockImplementation(() =>
    redirectFailureCode ? rejectWithCode(redirectFailureCode) : Promise.resolve(),
  );

  await render(Page);

  return {
    fillCredentials,
    async signIn() {
      await fillCredentials();
      await page.getByRole('button', { name: 'Sign In' }).click();
    },
  };
}

describe('sign-in page', () => {
  it('tells the user their credentials were wrong when sign-in is rejected', async () => {
    const { signIn } = await setup({ signInFailureCode: 'auth/invalid-credential' });

    await signIn();

    await expect.element(page.getByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('shows a generic message when sign-in fails for an unexpected reason', async () => {
    const { signIn } = await setup({ signInFailureCode: 'auth/some-future-code' });

    await signIn();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('An error occurred during authentication. Please try again.');
  });

  it('signs the user in with the email and the password of the form', async () => {
    const { signIn } = await setup();

    await signIn();

    expect(sessionMock.signInWithEmailPassword).toHaveBeenCalledExactlyOnceWith(
      'scout@example.com',
      'secret123',
    );
    expect(sessionMock.signUpWithEmailPassword).not.toHaveBeenCalled();
    // The button is enabled again when the sign-in is complete.
    await expect.element(page.getByRole('button', { name: 'Sign In' })).toBeEnabled();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('makes an account when the user changes to sign-up', async () => {
    const { fillCredentials } = await setup();

    await page.getByRole('button', { name: 'Need an account? Sign up' }).click();
    await expect.element(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await fillCredentials();
    await page.getByRole('button', { name: 'Sign Up' }).click();

    expect(sessionMock.signUpWithEmailPassword).toHaveBeenCalledExactlyOnceWith(
      'scout@example.com',
      'secret123',
    );
    expect(sessionMock.signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it('removes the error message when the user changes the mode', async () => {
    const { signIn } = await setup({ signInFailureCode: 'auth/invalid-credential' });
    await signIn();
    await expect.element(page.getByRole('alert')).toBeVisible();

    await page.getByRole('button', { name: 'Need an account? Sign up' }).click();

    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
    await expect
      .element(page.getByRole('button', { name: 'Already have an account? Sign in' }))
      .toBeVisible();
  });

  it('does not sign in with an email or a password that is not valid', async () => {
    const { fillCredentials } = await setup();

    await fillCredentials('not-an-email', '12345');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect.element(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect.element(page.getByText('Password must be at least 6 characters.')).toBeVisible();
    expect(sessionMock.signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it('shows the field messages when the user submits an empty form', async () => {
    await setup();

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect.element(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect.element(page.getByText('Password must be at least 6 characters.')).toBeVisible();
  });

  it('shows the message of a field when the user leaves it with a value that is not valid', async () => {
    await setup();

    await page.getByLabelText('Email').fill('not-an-email');
    await page.getByLabelText('Password').click();

    await expect.element(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect
      .element(page.getByText('Password must be at least 6 characters.'))
      .not.toBeInTheDocument();
  });

  it('starts the Google sign-in', async () => {
    await setup();

    await page.getByRole('button', { name: 'Continue with Google' }).click();

    expect(sessionMock.signInWithGoogle).toHaveBeenCalledOnce();
  });

  it('shows a message when the Google sign-in cannot start', async () => {
    await setup({ isGoogleUnavailable: true });

    await page.getByRole('button', { name: 'Continue with Google' }).click();

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('Network error. Please check your connection and try again.');
    await expect.element(page.getByRole('button', { name: 'Continue with Google' })).toBeEnabled();
  });

  it('completes a Google redirect sign-in when the page opens', async () => {
    await setup();

    expect(sessionMock.completeGoogleRedirect).toHaveBeenCalledOnce();
    await expect.element(page.getByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the message of a Google redirect sign-in that failed', async () => {
    await setup({ redirectFailureCode: 'auth/user-disabled' });

    await expect
      .element(page.getByRole('alert'))
      .toHaveTextContent('This account has been disabled.');
  });
});
