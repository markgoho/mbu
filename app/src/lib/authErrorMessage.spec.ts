import { describe, expect, it } from 'vitest';
import { authErrorMessage } from '#lib/authErrorMessage.js';

/**
An error with the shape that the Firebase Auth SDK throws.
*/
function firebaseError(code: string): Error {
  return Object.assign(new Error(`Firebase: Error (${code}).`), { code });
}

describe('authErrorMessage', () => {
  it.each([
    { code: 'auth/email-already-in-use', expected: 'An account with this email already exists.' },
    { code: 'auth/weak-password', expected: 'Password should be at least 6 characters.' },
    { code: 'auth/invalid-email', expected: 'Invalid email address.' },
    { code: 'auth/user-disabled', expected: 'This account has been disabled.' },
    { code: 'auth/user-not-found', expected: 'No account found with this email address.' },
    { code: 'auth/wrong-password', expected: 'Incorrect password.' },
    { code: 'auth/invalid-credential', expected: 'Invalid email or password.' },
    { code: 'auth/popup-closed-by-user', expected: 'Sign-in was cancelled.' },
    {
      code: 'auth/too-many-requests',
      expected: 'Too many failed attempts. Please try again later.',
    },
    {
      code: 'auth/network-request-failed',
      expected: 'Network error. Please check your connection and try again.',
    },
  ])('translates $code', ({ code, expected }) => {
    expect(authErrorMessage(firebaseError(code))).toBe(expected);
  });

  it('gives the general message for a code that is not in the table', () => {
    expect(authErrorMessage(firebaseError('auth/operation-not-allowed'))).toBe(
      'An error occurred during authentication. Please try again.',
    );
  });

  it('gives the general message for an error that has no code', () => {
    expect(authErrorMessage(new Error('boom'))).toBe(
      'An error occurred during authentication. Please try again.',
    );
  });

  it('gives the general message for a value that is not an error', () => {
    expect(authErrorMessage(undefined)).toBe(
      'An error occurred during authentication. Please try again.',
    );
  });
});
