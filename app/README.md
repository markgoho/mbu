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

## Environment

`.env.development` sets `VITE_FIREBASE_AUTH_EMULATOR_HOST`, so that `bun run dev` uses the local Auth emulator.
