import { type HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { signOut } from 'firebase/auth';
import { EMPTY, catchError, from, of, switchMap } from 'rxjs';
import { auth } from '../lib/firebase';

/**
 * API paths that require authentication. Requests matching any of these get a
 * Firebase ID token attached as a Bearer credential.
 */
const AUTHENTICATED_API_PATHS = ['/api/'];

/**
 * HTTP interceptor that manages Firebase Auth tokens on API requests.
 *
 * - Attaches the current user's ID token as a Bearer credential.
 * - If no user is authenticated, the request proceeds without modification.
 * - On a 401 response, signs the user out and redirects to /sign-in.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);

  const requiresAuth = AUTHENTICATED_API_PATHS.some((path) =>
    request.url.includes(path),
  );
  if (!requiresAuth) {
    return next(request);
  }

  return from(auth.currentUser?.getIdToken() ?? Promise.resolve(null)).pipe(
    catchError((tokenError: unknown) => {
      // Token acquisition failed (network error, revoked/expired token). Proceed
      // without a token; the server responds 401 if auth is required, which the
      // 401 handler below then catches.
      console.error('Failed to acquire auth token for request:', {
        url: request.url,
        error:
          tokenError instanceof Error ? tokenError.message : String(tokenError),
      });
      return of(null);
    }),
    switchMap((token) => {
      if (!token) {
        return next(request);
      }
      const authRequest = request.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
      return next(authRequest);
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        signOut(auth).then(
          () => void router.navigate(['/sign-in']),
          (signOutError: unknown) => {
            console.error('Sign out after 401 failed:', signOutError);
            void router.navigate(['/sign-in']);
          },
        );
        return EMPTY;
      }
      throw error;
    }),
  );
};
