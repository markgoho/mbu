# ADR 0002 — The app SPA is SvelteKit, not Angular

- **Status:** Accepted
- **Date:** 2026-10-02
- **Applies to:** `app/**`
- **Related:** #228 (the migration and its decisions), #229 to #239 (the sub-issues), #94 (Phase 1 epic), #102 (design pass), #240 (Go API rebuild), #280 (behavior differences to accept or reverse), `app/README.md`, `.claude/rules/svelte-tests.md`

## Context

#94 chose an Angular v22 SPA for the event platform, and #79 to #86 built it: 15 page routes, 6 services, 5 guards, 1 HTTP interceptor. Nothing was released, and there were no users and no production data. The owner's other product (doula-cloud) uses SvelteKit with Svelte 5 runes. The owner wants the same stack for the two products, and a change of stack is cheapest before a release. #228 replaced the Angular app in place. The last commit with the Angular source is `ec7a6fc83ca43b2e7a4b827262c5d0a53ade21ba`.

## Decision

`app/` is a SvelteKit 3 app (Svelte 5, runes forced on) that builds to static files. It replaces the Angular app; the two do not exist side by side. #228 has the full decision list and the Angular-to-Svelte mapping. `app/README.md` has the rules for new code. The decisions that shape the code are:

1. **Static SPA.** `@sveltejs/adapter-static` with `fallback: '200.html'`, and `ssr = false` in the root `+layout.ts`. Firebase Hosting rewrites each path that is not a file to `/200.html`. There is no server runtime: events are private and `noindex`, so SSR gives nothing.
2. **The auth transport does not change.** The client sends the Firebase ID token as `Authorization: Bearer` on `/api/*`. A 401 signs the user out and goes to `/sign-in`. The cookie and BFF session model of doula-cloud did not come over. The Firebase client is Auth only: all Firestore access goes through the API.
3. **One API client, two fetch functions.** `#lib/api.js` is the only place that calls `fetch`. `apiFetch` is for a component and navigates on a 401. `apiFetchNoRedirect` is for a `load`, which calls `redirect(303, ...)` itself. #228 planned one function; a `load` cannot use `goto()`, so #230 added the second.
4. **Guards are layout loads.** Each Angular `canActivate` guard is the `load` of a `+layout.ts`: in the nested route groups `(signed-out)`, `(authed)`, `(verified)` and `(app)`, and in the `admin` directory. A nested guard calls `await parent()` first, and each guard awaits `authStateReady()`. A guard uses `redirect(303, ...)`. The paths and the redirect targets of the 15 routes are the same as before (the comparison table is in PR #276).
5. **Services are `Fetcher` modules.** Each Angular service is a module of functions in `app/src/lib/`. A function that calls the API is one request and takes a `Fetcher` first. There is no dependency injection and no state in these modules. A read is in a `load`; a write is in a component, followed by `refreshAll()`. The shared session state is one `.svelte.ts` module.
6. **Test stack.** Vitest with two projects: `client` (`*.svelte.spec.ts`, real headless Chromium through `vitest-browser-svelte`) and `server` (all other `*.spec.ts`, Node). No `jsdom` and no direct `@testing-library/*` dependency. Playwright stays a smoke suite (`e2e/*.e2e.ts`) on the static build, with the Firebase Auth emulator and a `page.route()` mock for each `/api/*` call.
7. **Mock seam.** A page spec mocks the domain module (`vi.mock('#lib/universities.js')`) and `$app/navigation`, and gives the page a plain `data` prop. A `load` has its own Node spec (`page-load.spec.ts`). The fetch-wrapper modules have no specs of their own; pure-logic modules keep theirs. This is the earlier mbu rule: test the UI boundary with the service layer mocked. doula-cloud mocks one level lower, at `#lib/api.js`; that is the alternative if this seam becomes a problem.
8. **No coverage gate.** The Angular app had none. The 100% gate of doula-cloud on `src/lib/**` does not agree with decision 7, because it would need specs for the fetch-wrapper modules.

## Consequences

- An agent gets the Svelte guidance from the repo: `.claude/rules/svelte-tests.md` and the skills `svelte-code-writer` and `svelte-core-bestpractices`.
- Pages use the atoms in `app/src/lib/components/atoms/`, and ESLint refuses the raw elements. The UI was ported 1:1 (same copy, markup and CSS); #102 owns the design pass.
- The port has some intended behavior differences from the Angular app, for example the error page for a failed read and event dates in the timezone of the event. #280 has the list, so that the owner can accept or reverse each one.
- The API is one Cloud Function for each domain, so the Vite dev proxy has five entries. #240 (Go API) will change this to one `/api` entry and will change the error body to `{ code, message, details }`. The app side of that change is #263. #265 decides later if sessions replace the Bearer token.
- Not verified by the migration: a run against the real `functions/` API, and the Google redirect sign-in in a real browser (#279).
