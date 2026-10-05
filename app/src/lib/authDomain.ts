// The default auth domain of the Firebase project.
export const PROJECT_AUTH_DOMAIN = 'merit-badge-university.firebaseapp.com';

// The production hosts of the `app-site` Hosting target.
const APP_HOSTS = new Set(['mbu-platform.web.app', 'mbu-platform.firebaseapp.com']);

/**
 * Returns the Firebase `authDomain` for a page on `host` (#279). On a
 * production host it is the host itself: Firebase Hosting serves
 * `/__/auth/handler` on each site, so the Google redirect returns to the same
 * origin, and a browser that partitions third-party storage (Chrome, Safari,
 * Firefox) still gives `getRedirectResult` its result. Each such host needs
 * `https://<host>/__/auth/handler` in the authorized redirect URIs of the OAuth
 * web client. Any other host (the dev server with the Auth emulator, a preview
 * channel, where there is no sign-in: #319) keeps the project default.
 */
export function authDomainFor(host: string): string {
  return APP_HOSTS.has(host) ? host : PROJECT_AUTH_DOMAIN;
}
