import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { auth } from '../lib/firebase';
import { safeReturnTo } from '../lib/return-to';
import { Auth } from '../services/auth';

/**
 * Requires an authenticated user. Waits for Firebase to restore any persisted
 * session first, so a hard refresh on a protected route doesn't bounce a
 * signed-in user. Redirects to /sign-in otherwise.
 */
export const requireAuth: CanActivateFn = async () => {
  const router = inject(Router);
  await auth.authStateReady();
  return auth.currentUser ? true : router.parseUrl('/sign-in');
};

/** Requires a verified email. Redirects to /verify-email otherwise. */
export const requireVerified: CanActivateFn = async () => {
  const router = inject(Router);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) return router.parseUrl('/sign-in');
  return user.emailVerified ? true : router.parseUrl('/verify-email');
};

/**
 * Requires a completed onboarding/consent. Bootstraps the account and redirects
 * to /onboarding when consent is still needed.
 */
export const requireOnboarded: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(Auth);
  const bootstrap = await authService.ensureBootstrap();
  return bootstrap?.needsConsent ? router.parseUrl('/onboarding') : true;
};

/** Inverse of requireAuth: sends already signed-in users to the app home. */
export const requireUnauth: CanActivateFn = async (route) => {
  const router = inject(Router);
  await auth.authStateReady();
  if (!auth.currentUser) return true;
  return router.parseUrl(safeReturnTo(route.queryParamMap));
};
