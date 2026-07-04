import type { ParamMap } from '@angular/router';

/**
 * Resolve a `returnTo` query param to a safe same-origin path.
 *
 * Only accepts absolute in-app paths (`/foo`); rejects protocol-relative
 * (`//evil.com`) and anything else to prevent open redirects. Falls back to
 * the app home when absent or unsafe.
 */
export function safeReturnTo(params: ParamMap): string {
  const value = params.get('returnTo');
  if (value?.startsWith('/') && !value.startsWith('//')) {
    return value;
  }
  return '/';
}
