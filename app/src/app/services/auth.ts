import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, resource, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  getRedirectResult,
  GoogleAuthProvider,
  onIdTokenChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { firstValueFrom } from 'rxjs';
import type { BootstrapResponse, UserResponse } from '../api-types/users-api.types';
import { auth } from '../lib/firebase';

// Shared auth error messages, translated from Firebase error codes.
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

@Service()
export class Auth {
  private readonly httpClient = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly authUser = signal<User | null>(null);

  readonly user = this.authUser.asReadonly();
  readonly emailVerified = computed(() => this.authUser()?.emailVerified ?? false);

  // superAdmin custom claim, resolved from the ID token. Fails closed to false:
  // an undefined value covers both "loading" and "claim fetch failed".
  private readonly superAdminClaim = resource({
    params: () => this.authUser(),
    loader: async ({ params: user }) => {
      if (!user) return false;
      const result = await getIdTokenResult(user);
      return result.claims['superAdmin'] === true;
    },
  });
  readonly superAdmin = computed(() => this.superAdminClaim.value() ?? false);

  // Bootstraps the account on the backend, but only once the user exists and
  // has a verified email (the API rejects unverified sessions with 403).
  readonly session = resource({
    params: () =>
      this.authUser() && this.emailVerified() ? { uid: this.authUser()?.uid } : undefined,
    loader: () => this.postBootstrap(),
  });

  readonly needsConsent = computed(() => this.session.value()?.needsConsent ?? false);
  readonly sessionUser = computed(() => this.session.value()?.user);

  constructor() {
    effect((onCleanup) => {
      // onIdTokenChanged re-emits on token refresh, keeping emailVerified and
      // custom claims current (not just on sign-in/out).
      const unsubscribe = onIdTokenChanged(
        auth,
        (user) => this.authUser.set(user),
        (error) => console.error('Auth ID token listener error:', error),
      );
      onCleanup(unsubscribe);
    });

    effect(() => {
      const error = this.superAdminClaim.error();
      if (error) {
        console.error(
          'Failed to resolve superAdmin claim; treating user as non-super-admin:',
          error,
        );
      }
    });
  }

  get currentUser(): User | null {
    return auth.currentUser;
  }

  private async postBootstrap(): Promise<BootstrapResponse> {
    return await firstValueFrom(this.httpClient.post<BootstrapResponse>('/api/users/me', {}));
  }

  /**
   * Bootstraps the account and returns the response, used by route guards.
   * Returns undefined when there is no verified user (nothing to bootstrap).
   */
  async ensureBootstrap(): Promise<BootstrapResponse | undefined> {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) return undefined;
    return await this.postBootstrap();
  }

  /**
   * Resolves the superAdmin custom claim directly from the ID token, for use
   * in route guards. The `superAdmin` signal above fails closed to `false`
   * while its claim resource loads, so a guard reading it synchronously would
   * incorrectly reject a super-admin whose claim hasn't resolved yet.
   */
  async ensureSuperAdmin(): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) return false;
    const result = await getIdTokenResult(user);
    return result.claims['superAdmin'] === true;
  }

  // Redirect-based (not signInWithPopup): avoids the Cross-Origin-Opener-Policy
  // warning Google's own sign-in page triggers when the SDK tries to close the
  // popup. Navigates away, so callers should not expect this to resolve normally
  // — the sign-in completes on the next load via completeGoogleRedirect().
  async signInWithGoogle(): Promise<void> {
    try {
      await signInWithRedirect(auth, new GoogleAuthProvider());
    } catch (error) {
      throw this.translateAuthError(error, 'signInWithGoogle');
    }
  }

  /** Resolves a pending Google redirect sign-in on return, if one is in progress. */
  async completeGoogleRedirect(): Promise<UserCredential | null> {
    try {
      return await getRedirectResult(auth);
    } catch (error) {
      throw this.translateAuthError(error, 'completeGoogleRedirect');
    }
  }

  async signInWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw this.translateAuthError(error, 'signInWithEmailPassword');
    }
  }

  async signUpWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user, {
        url: `${globalThis.location.origin}/onboarding`,
      });
      return credential;
    } catch (error) {
      throw this.translateAuthError(error, 'signUpWithEmailPassword');
    }
  }

  async resendEmailVerification(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No authenticated user');
    }
    try {
      await sendEmailVerification(user, {
        url: `${globalThis.location.origin}/onboarding`,
      });
    } catch (error) {
      throw this.translateAuthError(error, 'resendEmailVerification', {
        uid: user.uid,
      });
    }
  }

  /** Reloads the current user, then forces a token refresh so listeners re-emit. */
  async reloadUser(): Promise<void> {
    const current = auth.currentUser;
    if (!current) return;
    try {
      await current.reload();
      await current.getIdToken(true);
    } catch (error) {
      console.error('Error reloading user:', error);
      throw new Error('Failed to reload user data.', { cause: error });
    }
  }

  /** Right-to-erasure: deletes the backend account, then signs out. */
  async deleteAccount(): Promise<void> {
    await firstValueFrom(this.httpClient.delete('/api/users/me'));
    await this.signOut();
  }

  /**
   * Stamps the one-time roster-export acknowledgment and updates the cached
   * session user in place, so `sessionUser()` reflects it immediately without
   * a re-bootstrap.
   */
  async ackRosterExport(): Promise<void> {
    const user = await firstValueFrom(
      this.httpClient.post<UserResponse>('/api/users/me/roster-export-ack', {}),
    );
    this.session.value.update((current) => (current ? { ...current, user } : current));
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      void this.router.navigate(['/sign-in']);
    } catch (error) {
      console.error('Sign out failed:', {
        uid: auth.currentUser?.uid,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Failed to sign out. Please try again.', {
        cause: error,
      });
    }
  }

  private translateAuthError(
    error: unknown,
    method: string,
    context: Record<string, unknown> = {},
  ): Error {
    const errorCode = (error as { code?: string }).code ?? 'auth/unknown-error';
    console.error(`Auth.${method} failed:`, {
      method,
      errorCode,
      error: error instanceof Error ? error.message : String(error),
      ...context,
    });
    return new Error(AUTH_ERROR_MESSAGES[errorCode] ?? AUTH_ERROR_MESSAGES['auth/unknown-error']);
  }
}
