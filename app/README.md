# App

The event-platform SPA. It is a SvelteKit app (Svelte 5 runes) that builds to static files with `@sveltejs/adapter-static`. There is no SSR: Firebase Hosting serves `build/200.html` for each path that is not a file.

## Commands

Run all commands in `app/` with `bun`.

| Command             | Function                                                       |
| ------------------- | -------------------------------------------------------------- |
| `bun install`       | Install the dependencies.                                      |
| `bun run dev`       | Start the dev server on `http://localhost:4200`.               |
| `bun run build`     | Build the static site into `build/`.                           |
| `bun run preview`   | Serve the build locally.                                       |
| `bun run check`     | Type-check with `svelte-check`.                                |
| `bun run lint`      | Lint with ESLint.                                              |
| `bun run test:unit` | Run the unit specs one time with Vitest.                       |
| `bun run test:e2e`  | Run the Playwright suite. It does not run until #238 ports it. |

## Unit specs

Vitest has two projects:

- `client`: `src/**/*.svelte.spec.ts`. These run in headless Chromium with `vitest-browser-svelte`.
- `server`: all other `src/**/*.spec.ts`. These run in Node.

The two projects use the `America/New_York` timezone.

The `playwright` and `@playwright/test` versions in `package.json` are exact. They must be the same as `PLAYWRIGHT_VERSION` in the root `Dockerfile`, because the CI image contains the Chromium build for that version only. Change them together. On a local machine, install the browser with `bunx playwright install chromium`.

## Dev proxy

The API is one Cloud Function for each domain. The dev server sends each path prefix to its function in the local Functions emulator (`http://localhost:5001/merit-badge-university/us-east4/<function>`):

| Path prefix               | Function           |
| ------------------------- | ------------------ |
| `/api/health`             | `healthApi`        |
| `/api/users`              | `usersApi`         |
| `/api/universities`       | `universitiesApi`  |
| `/api/admin/universities` | `universitiesApi`  |
| `/api/registrations`      | `registrationsApi` |

The entries are in `vite.config.ts`. Start the emulators from the repo root before you call the API from the dev server.

## Auth and API client

All code gets Firebase Auth and the API through these modules in `src/lib/`:

- `firebase.ts`: `getFirebaseAuth()` is the only place that calls `initializeApp` and `getAuth`. The client uses Auth only. All Firestore access goes through the API.
- `api.ts`: the only place that calls `fetch` for `/api/*`. `apiFetch` adds the Firebase ID token as `Authorization: Bearer`. On a 401 it signs the user out and goes to `/sign-in`. `apiFetchNoRedirect` does the same but does not navigate: use it in a `load`, and call `redirect(303, '/sign-in')` there. `expectOk`, `getJson` and `sendJson` throw an `ApiError` (`status` and the parsed `body`) for a response that is not OK.
- `fetcher.ts`: the `Fetcher` type. A domain module takes a `Fetcher` as a parameter. A route passes `apiFetch` or `apiFetchNoRedirect`.
- `apiErrorMessage.ts`: `apiErrorMessage(error, fallback)` gives the text to show for a failed call.
- `api-types/`: the request and response types of the API.

## Session and route guards

`src/lib/session.svelte.ts` is the session of the signed-in user:

- `session.user`, `session.emailVerified` and `session.superAdmin` are reactive. They come from the Firebase ID token listener, which starts at the first read.
- `signInWithGoogle`, `completeGoogleRedirect`, `signInWithEmailPassword`, `signUpWithEmailPassword`, `resendEmailVerification`, `reloadUser` and `signOut` change the session. The functions that change who is signed in, or the state of the user, call `invalidateAll()` themselves, so the guards run again. A caller does not do that.
- `bootstrap`, `deleteAccount` and `ackRosterExport` call the API. They take a `Fetcher`.

A guard is the `load` of a `+layout.ts` in a route group. The route groups do not change the URL. The nesting is the order of the guards:

| Route group                       | Guard                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------- |
| `(signed-out)`                    | A signed-in user goes to the `returnTo` path, or to `/`.                     |
| `(authed)`                        | A visitor with no session goes to `/sign-in`.                                |
| `(authed)/(verified)`             | A user with an email that is not verified goes to `/verify-email`.           |
| `(authed)/(verified)/(app)`       | Bootstraps the account. An account that needs consent goes to `/onboarding`. |
| `(authed)/(verified)/(app)/admin` | A user with no `superAdmin` claim goes to `/`.                               |

Rules for a guard `load`:

- A guard that is below a different guard calls `await parent()` first. SvelteKit runs the layout loads of a route at the same time, and this gives the guards a fixed order.
- `await getFirebaseAuth().authStateReady()` before the read of `currentUser` or an API call.
- Use `redirect(303, ...)`, not `goto()`. Use `apiFetchNoRedirect` for an API call.

The `(app)` guard returns the bootstrap response as `data.session`. A page in that group reads the account from `page.data.session`. `invalidate(SESSION_DEPENDENCY)` loads it again.

Use the route ID with `resolve()` from `$app/paths`, for example `resolve('/(signed-out)/sign-in')`. The result is the URL (`/sign-in`).

## Environment

`.env.development` sets `VITE_FIREBASE_AUTH_EMULATOR_HOST`, so that `bun run dev` uses the local Auth emulator.
