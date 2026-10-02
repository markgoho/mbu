// The messages to show for the error codes of the Firebase Auth SDK.
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-email': 'Invalid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled.',
  'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/unknown-error': 'An error occurred during authentication. Please try again.',
};

const UNKNOWN_ERROR_CODE = 'auth/unknown-error';
const UNKNOWN_ERROR_MESSAGE = 'An error occurred during authentication. Please try again.';

/**
Returns the `code` of an error from the Firebase Auth SDK, or `auth/unknown-error` if it has none.
*/
export function authErrorCode(error: unknown): string {
  const code = (error as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? code : UNKNOWN_ERROR_CODE;
}

/**
 * Returns the text to show for an error from the Firebase Auth SDK. An error
 * with a code that is not in the table, or with no code, gives the general
 * message.
 */
export function authErrorMessage(error: unknown): string {
  return AUTH_ERROR_MESSAGES[authErrorCode(error)] ?? UNKNOWN_ERROR_MESSAGE;
}
