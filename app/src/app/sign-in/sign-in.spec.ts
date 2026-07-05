import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SignIn } from './sign-in';

// Mock at the firebase SDK boundary so the real Auth service runs — this is the
// only place the user sees Auth's error translation, so we exercise it here
// rather than testing the service in isolation.
const { mockAuth, mockSignIn } = vi.hoisted(() => ({
  mockAuth: { currentUser: null as unknown },
  mockSignIn: vi.fn(),
}));

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: () => mockAuth,
  connectAuthEmulator: vi.fn(),
  onIdTokenChanged: vi.fn(() => vi.fn()),
  getIdTokenResult: vi.fn(),
  signInWithEmailAndPassword: mockSignIn,
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(() => Promise.resolve()),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(() => Promise.resolve()),
  GoogleAuthProvider: class {},
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
}));

describe('SignIn', () => {
  interface SetupOptions {
    // Sign-in fails with a failure the app has no specific message for
    // (vs. a recognized bad-credentials failure, the default).
    unrecognizedFailure?: boolean;
  }

  async function setup({ unrecognizedFailure = false }: SetupOptions = {}) {
    vi.spyOn(console, 'error').mockReturnValue(undefined);
    mockAuth.currentUser = null;
    mockSignIn.mockReset();
    mockSignIn.mockRejectedValue({
      code: unrecognizedFailure ? 'auth/some-future-code' : 'auth/invalid-credential',
    });

    const user = userEvent.setup();
    await render(SignIn, {
      providers: [provideHttpClient(), provideRouter([])],
    });

    return {
      async signIn() {
        await user.type(screen.getByLabelText('Email'), 'scout@example.com');
        await user.type(screen.getByLabelText('Password'), 'secret123');
        await user.click(screen.getByRole('button', { name: 'Sign In' }));
      },
    };
  }

  it('tells the user their credentials were wrong when sign-in is rejected', async () => {
    const { signIn } = await setup();

    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('shows a generic message when sign-in fails for an unexpected reason', async () => {
    const { signIn } = await setup({ unrecognizedFailure: true });

    await signIn();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'An error occurred during authentication. Please try again.',
    );
  });
});
