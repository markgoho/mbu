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

## Domain modules

Each API domain is one module of functions in `src/lib/`. A function is one request. It takes a `Fetcher` first, and it throws an `ApiError` for a response that is not OK. The modules keep no state, do not import from `$app/*`, and do not call `fetch`.

| Module             | Functions                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `universities.ts`  | `listMine`, `listBadges`, `getUniversity`, `getPublicUniversity`, `getReviewQueue`, `createUniversity`, `patchUniversity`, `deleteUniversity`, `submitUniversity`, `closeUniversity`, `putPeriods`, `createClass`, `patchClass`, `deleteClass`, `approveUniversity`, `rejectUniversity` |
| `registrations.ts` | `getSchedule`, `getRoster`, `registerScout`, `cancelRegistration`                                                                                                                                                                                                                       |
| `scouts.ts`        | `listScouts`, `createScout`, `removeScout`                                                                                                                                                                                                                                              |
| `health.ts`        | `getHealth`                                                                                                                                                                                                                                                                             |

Rules for a route that uses them:

- A read goes in the `load` of `+page.ts`, with `apiFetchNoRedirect`. The route owns its read: the `load` gets the ID from `params`. There is no "active ID" in a module.
- A `load` under a guard group calls `await parent()` first. A `load` that is in no guard group (`/e/[id]`) calls `await getFirebaseAuth().authStateReady()` before the first request.
- The `load` maps the `ApiError`. For a 401, `redirect(303, resolve('/(signed-out)/sign-in'))`. For a 403 on a university that the user does not own, `redirect(303, ...)` to `/universities?denied=1`, and the dashboard shows the message from the URL. For other errors, `error(status, apiErrorMessage(error, fallback))`.
- A write goes in a component, with `apiFetch`. After a write, call `invalidateAll()` (or `invalidate` with a `depends()` key of the `load`). The modules do not load data again after a write.
- A route spec mocks the module (`vi.mock('#lib/universities.js')`). The modules have no specs of their own.

`formAction.svelte.ts` has the `FormAction` class for a write that a button or a form starts. `pending` and `error` are reactive. `run({ action, fallback, confirm?, onSuccess? })` ignores a call while one is in progress, asks the `confirm` question if there is one, and puts the `apiErrorMessage` of a failure in `error`.

The other modules are pure logic with specs: `eventDatetime.ts` (`datetime-local` input values), `rosterCsv.ts` (roster CSV export), `scheduleRules.ts` (period conflicts and progress of a scout). `disclaimer.ts` has the counselor disclaimer text, which must stay the same as `functions/src/constants/disclaimer.ts`.

## Shared components

The shared components are in `src/lib/components/`. They have the same copy and CSS as the shared components of the Angular app. #102 owns the visual design.

- `StatusBadge.svelte`: the status of a university. `status` is a `UniversityStatus`.
- `ConfirmDialog.svelte`: a question with a confirm action and a cancel action, in a native modal `<dialog>`. Render it always and bind `open`. Do not put it in an `{#if}` block. `onCancel` runs for the cancel button, the Escape key and a click on the backdrop.

The atoms are in `src/lib/components/atoms/`: `Button`, `Link`, `TextInput`, `Select`, `Textarea`, `Checkbox`. Each atom renders one native element, passes all other attributes and event handlers to it, and has no style.

Rules for a page:

- Use the atoms. ESLint (`svelte/no-restricted-html-elements`) refuses a raw `<button>`, `<a>`, `<input>`, `<select>` or `<textarea>` in all `.svelte` files but the atoms. A radio input and a file input have no atom: disable the rule on that line, with a comment that gives the reason.
- `Button` has `type="button"` as the default. Give `type="submit"` to the submit button of a form.
- `Link` takes an `href` that is already resolved. For a route of the app, make it with `resolve()` from `$app/paths`. Add a query string to the result of `resolve()`.
- `TextInput`, `Select` and `Textarea` bind `value`. `Checkbox` binds `checked`. The `value` of a `TextInput` with `type="number"` is a number, as for the native element.
- The children of `Select` are its `<option>` elements. `Checkbox` and `TextInput` render only the control: the page supplies the `<label>`.
- A `class` on an atom goes to the native element, but a scoped `<style>` rule of the page does not match an element of a child component. Use `:global()` below a scoped selector, for example `.dashboard :global(.dashboard__card)`.
- `FormAction` still asks its `confirm` question with `globalThis.confirm`. #102 decides if it moves to `ConfirmDialog`.

A component spec is `<Name>.svelte.spec.ts` next to the component. For a `children` snippet, use `htmlSnippet()` from `src/lib/components/testSnippet.ts`. For a bindable prop, give `render` a property with a getter and a setter, and assert on the value that the setter received.

## Environment

`.env.development` sets `VITE_FIREBASE_AUTH_EMULATOR_HOST`, so that `bun run dev` uses the local Auth emulator.
