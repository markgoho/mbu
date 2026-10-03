# App

The event-platform SPA. It is a SvelteKit app (Svelte 5 runes) that builds to static files with `@sveltejs/adapter-static`. There is no SSR: Firebase Hosting serves `build/200.html` for each path that is not a file.

## Commands

Run all commands in `app/` with `bun`.

| Command             | Function                                         |
| ------------------- | ------------------------------------------------ |
| `bun install`       | Install the dependencies.                        |
| `bun run dev`       | Start the dev server on `http://localhost:4200`. |
| `bun run build`     | Build the static site into `build/`.             |
| `bun run preview`   | Serve the build locally.                         |
| `bun run check`     | Type-check with `svelte-check`.                  |
| `bun run lint`      | Lint with ESLint.                                |
| `bun run test:unit` | Run the unit specs one time with Vitest.         |
| `bun run test:e2e`  | Run the Playwright smoke suite one time.         |

## Unit specs

Vitest has two projects:

- `client`: `src/**/*.svelte.spec.ts`. These run in headless Chromium with `vitest-browser-svelte`.
- `server`: all other `src/**/*.spec.ts`. These run in Node.

The two projects use the `America/New_York` timezone.

The conventions for the specs (the `setup()` function, `page` locators, the mock seam, fixtures) are in `.claude/rules/svelte-tests.md` in the repo root. The reasons for the stack are in `functions/docs/adr/0002-app-spa-is-sveltekit.md`.

The `playwright` and `@playwright/test` versions in `package.json` are exact. They must be the same as `PLAYWRIGHT_VERSION` in the root `Dockerfile`, because the CI image contains the Chromium build for that version only. Change them together. On a local machine, install the browser with `bunx playwright install chromium`.

## E2E specs

The Playwright suite is a smoke suite. It stays small: the unit specs own the behavior of the UI. A new flow gets an e2e spec only if it needs the real Firebase Auth or the real build.

- The config is `playwright.config.ts`. The specs are `e2e/*.e2e.ts`: `auth-smoke`, `home`, `registration`, `roster`, and `accessibility` (an axe scan of `/sign-in` and `/e/<id>` for WCAG 2.2 AA; #102 owns the full accessibility pass).
- `bun run test:e2e` starts two servers and stops them at the end. The first is the Firebase Auth emulator on port 9099. The second is the static build (`bun run build && bun run preview`) on port 4173, built with `VITE_FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`. There is no Functions emulator and no Firestore emulator.
- The `firebase` CLI is a dependency of the repo root. Run `bun install` in the repo root before the first run.
- On a local machine, the suite uses an Auth emulator that runs already on port 9099. It always makes a new build and a new preview server, so port 4173 must be free. After a run, `build/` is a build that connects to the Auth emulator: run `bun run build` again before you use `build/` for a different purpose.
- The preview server has no `/api` proxy. A spec mocks each `/api/*` call with `page.route()` before the navigation. A call with no mock is aborted, and the test fails with the list of those calls.
- Import `test` and `expect` from `e2e/fixtures/auth.fixture.ts`, not from `@playwright/test`. The `page` fixture has the guard for calls with no mock. The `verifiedPage` fixture makes a verified account in the emulator, mocks `POST /api/users/me` and `GET /api/health`, signs in through the UI, and gives the page on the app home.
- Each test makes its own account in the emulator: the email is `e2e-<test ID>-<repeat>-<retry>-<time>@example.com` and the password is `password123`. There is no seeded account.
- Type the mock data with the types in `src/lib/api-types/`.
- To run one file: `bun run test:e2e e2e/home.e2e.ts`. The report is in `playwright-report/` (`bunx playwright show-report`).
- `bun run check` and `bun run lint` include `e2e/` and `playwright.config.ts`.

## Dev proxy

The dev server sends each `/api` call to the Go API on `http://localhost:8080` (one entry in `vite.config.ts`). To start the API, the database and the Auth emulator together with the dev server, run `bun run dev:platform` in the repo root. `bun run seed:platform` fills them with seed data. The details are in `api/docs/environment.md`.

The Go API has only `GET /api/health` until the route tickets of #240 (#249 to #255) land. Until then, the other calls from the dev server get a 404.

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
- `signInWithGoogle`, `completeGoogleRedirect`, `signInWithEmailPassword`, `signUpWithEmailPassword`, `resendEmailVerification`, `reloadUser` and `signOut` change the session. The functions that change who is signed in, or the state of the user, call `refreshAll()` themselves, so the guards run again. A caller does not do that.
- `bootstrap`, `completeOnboarding`, `deleteAccount` and `ackRosterExport` call the API. They take a `Fetcher`.

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
- The `load` maps the `ApiError`. For a 401, `redirect(303, resolve('/(signed-out)/sign-in'))`. For a 403 on a university that the user does not own, `redirect(303, ...)` to `/universities?denied=<reason>`, and the dashboard shows the message of that reason. For other errors, `error(status, apiErrorMessage(error, fallback))`. `failLoad(error, { fallback, denied? })` from `loadFailure.ts` does this mapping: call it in the `catch` block of the read. The reasons are `university` (the editor) and `roster` (the rosters). A route with a new denied message adds its reason to `DENIED_MESSAGES` in that module. With `forbidden: 'home'`, a 403 goes to the app home with no message: the super-admin routes use it.
- A write goes in a component, with `apiFetch`. After a write, call `refreshAll()` (or `invalidate` with a `depends()` key of the `load`). Do not use `invalidateAll`: SvelteKit 3 marks the function and the `goto` option of that name as deprecated. The modules do not load data again after a write.
- A route spec mocks the module (`vi.mock('#lib/universities.js')`). The modules have no specs of their own.

`formAction.svelte.ts` has the `FormAction` class for a write that a button or a form starts. `pending` and `error` are reactive. `run({ action, fallback, confirm?, onSuccess? })` ignores a call while one is in progress, asks the `confirm` question if there is one, and puts the `apiErrorMessage` of a failure in `error`.

The other modules are pure logic with specs: `eventDatetime.ts` (`datetime-local` input values), `rosterCsv.ts` (roster CSV export), `scheduleRules.ts` (period conflicts and progress of a scout), `periodOverlap.ts` (`findOverlaps`, periods that overlap in time), `formatDate.ts` (`formatMediumDate`, date text as `Jun 1, 2026`, `formatShortTime`, time text as `9:00 AM`, and `formatMediumDateTime`, date and time text as `Jun 1, 2026, 9:00:00 AM`; each takes an optional IANA timezone, and uses the timezone of the browser when there is none), `emailAddress.ts` (`isEmailAddress`, the email rule of the forms). `disclaimer.ts` has the counselor disclaimer text, which must stay the same as `functions/src/constants/disclaimer.ts`.

## Shared components

The shared components are in `src/lib/components/`. #102 owns the visual design.

- `StatusBadge.svelte`: the status of a university. `status` is a `UniversityStatus`.
- `ConfirmDialog.svelte`: a question with a confirm action and a cancel action, in a native modal `<dialog>`. Render it always and bind `open`. Do not put it in an `{#if}` block. `onCancel` runs for the cancel button, the Escape key and a click on the backdrop.
- `UniversityForm.svelte`: the fields of a university, for the create page and the editor. `initial` is the university to edit, `readonly` disables the fields, and `onSave(values)` gets the `UniversityFormValues` (the module also exports this type).

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

## Pages

Rules for a page in `src/routes/`, from the account routes:

- Type the `data` prop with `PageData` (`let { data }: { data: PageData } = $props()`). A spec then renders the page with only `data`.
- A read that must not block the page, or replace it with the error page, is a promise that the `load` returns and does not await. The promise does not reject: the `load` maps a failure to a value. The page reads it with `{#await}`. The app home does this for the API health.
- A form has `novalidate` and shows its own field messages. A field shows its message after the user left it (`onblur`) or tried to submit.
- The sign-in page does not navigate after a sign-in: the session functions invalidate the `load` data and the `(signed-out)` guard redirects. A page that leaves its guard group for a different one (`/verify-email`, `/onboarding`) calls `goto()`.
- The account pages do not use `FormAction`. `FormAction` shows the message of the API. These pages show the message of the session function (`error.message`) or a fixed message.
- The spec of a page is `page.svelte.spec.ts` next to it. The spec of a `+page.ts` load is `page-load.spec.ts` (Node project).
- The app has no sign-out control yet. `signOut()` of the session module is ready for one.

Rules for a page with child components, from the chancellor routes:

- A component that only one route uses is in the folder of that route (`universities/[id]/PeriodBoard.svelte`). A component that two routes use is in `src/lib/components/`.
- A child component does not import a domain module and does not call the API. It takes its data as props and gives the values of a write to a callback prop that returns a promise (`onSave`, `onCreate`, `onUpdate`, `onDelete`). The page makes the request with `apiFetch` and then calls `refreshAll()`, in the same callback.
- The child owns a `FormAction` and runs `action: () => onSave(values)`. As a result, it shows "Saving…" until the route has its new data, and it shows the message of the API when the callback rejects. The spec of the child passes a `vi.fn()` and needs no module mock.
- Form state that starts from a prop is a writable `$derived` of a small class with `$state` fields (`let fields = $derived(new Fields(initial))`), not `$state` with an `$effect`. The fields then start again when the route loads its data again, and `bind:value={fields.title}` works. A list of rows that the user changes is the same (`rows = [...rows, new Row()]`).
- These forms have `novalidate` and no field messages: a submit with a field that is not valid does nothing. #102 owns the field messages.
- Fixture data that the page spec and the load spec of a route share is in a file next to them (`roster/rosterFixture.ts`).

Rules from the parent routes:

- The `load` of a public page (`/e/[id]`) does not throw and does not redirect. It does not use `failLoad`, because that function sends a 401 to `/sign-in`. It returns the failure as a value (`{ event: undefined, failure: 'not-found' | 'failed' }`), and the page shows its own state for each value.
- The public page does not read the session. Its link to the registration page is `/sign-in?returnTo=/e/<id>/register`: the `(signed-out)` guard sends a signed-in user to the `returnTo` path immediately.
- A page of an event gives the timezone of the university to `formatMediumDate` and `formatShortTime`.
- A write whose failure is not always an error message does not use `FormAction`. The registration page keeps its own state, because a `class_full` answer opens the waitlist offer.
- A component of one route that shows a fixed message for a failed write (`ScoutQuickAdd.svelte`) also keeps its own state. It still takes a callback prop that returns a promise (`onAdd`).

Rules from the super-admin routes:

- A `load` under `admin/` gives `forbidden: 'home'` to `failLoad`. The `admin` guard reads the `superAdmin` claim from the ID token, and the API reads it again. A 403 from the API then means that the user has no claim now, so the user goes to `/`, as the guard does. Do not give `denied` there: that message is for a chancellor.
- A page that ends with a decision (approve, reject) goes back to its list with `goto(path, { refreshAll: true })` in the `onSuccess` of its `FormAction`. The list and the guards above it then load again.
- The review queue has no timezone of an event in its rows. It shows dates and times in the timezone of the browser.

## Environment

`.env.development` sets `VITE_FIREBASE_AUTH_EMULATOR_HOST`, so that `bun run dev` uses the local Auth emulator.
