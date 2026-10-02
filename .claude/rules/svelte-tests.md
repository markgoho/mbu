---
paths:
  - "app/src/**/*.spec.ts"
---

# Svelte Test Conventions (Vitest + vitest-browser-svelte)

Stack-specific rules for `app/src/**/*.spec.ts`. This glob includes `*.svelte.spec.ts`. The rules build on the general SIFERS principles in `~/.claude/rules/testing-philosophy.md` (DRY, hide mechanics, explicit parameters, behavioral focus). Where the two conflict, this file wins, because that file was written for a different stack.

Vitest has two projects (`app/vite.config.ts`). The file name selects the project:

- `client`: `*.svelte.spec.ts`. Real headless Chromium through `vitest-browser-svelte` and `@vitest/browser-playwright`. Component specs (`<Name>.svelte.spec.ts`) and page specs (`page.svelte.spec.ts`) go here.
- `server`: all other `*.spec.ts`. Node. Pure-logic specs and `load` specs (`page-load.spec.ts`, `<group>-layout-load.spec.ts`) go here.

Each spec is beside the file that it tests. Each test must have an assertion (`requireAssertions`). The Playwright smoke suite (`app/e2e/*.e2e.ts`) is not in the scope of this file: see "E2E specs" in `app/README.md`.

## SIFERS: one `setup()` per `describe` block

Prefer a `setup()` function over `beforeEach`/repeated inline `render()` calls. It centralizes prop construction, gives every test a happy-path default, and returns only what the test needs to exercise and assert — `render()` registers its own cleanup, so `setup()` never needs to return a teardown handle.

```typescript
interface SetupOptions {
  status?: UniversityStatus;
  approveError?: Error;
}

async function setup({ status = 'submitted', approveError }: SetupOptions = {}) {
  universities.approveUniversity.mockReset();
  universities.approveUniversity.mockImplementation(() =>
    approveError ? Promise.reject(approveError) : Promise.resolve(),
  );
  await render(Page, {
    data: {
      session,
      university: { ...sampleDetail.university, status },
      classes: sampleDetail.classes,
    },
  });
  return { approveButton: page.getByRole('button', { name: 'Approve' }) };
}

it('shows the message of the API when the approve request fails', async () => {
  const { approveButton } = await setup({
    approveError: new ApiError(409, { error: 'Add a class first.' }),
  });
  await approveButton.click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Add a class first.');
});
```

`render()` is async-only as of `vitest-browser-svelte@3` — `setup()` must be `async` and every call site must `await` it, even when the test doesn't otherwise await anything before it.

`setup()` resets each mock that it configures (`mockReset()`), so that a test does not see the calls of the test before it.

If a spec needs a per-test DOM lookup helper (e.g. reading a value next to a label), define it alongside `setup()` rather than repeating a DOM-walk expression (`.element().nextElementSibling`) in every test.

**Where it lives is decided by lint, not by taste.** `unicorn/consistent-function-scoping` refuses a function nested inside a `describe` that closes over nothing that block owns — which is nearly every `setup()` this rule asks for, since a setup normally reaches only for the file's own mocks, the fixture, and the component. So a `setup()` sits at module scope unless it genuinely reads something its block declares. A file with more than one names each for the block it serves (`setupEditor`, `setupRoster`) rather than shadowing one name; one per `describe` is the rule, one function called `setup` is not.

Don't add `setup()` to specs with no real construction to hide — a table of pure-function assertions (`expect(fn(x)).toBe(y)`) gains nothing from a setup wrapper.

## Interactions: use `page` locators, never `fireEvent`/`dispatchEvent`

This stack runs `vitest-browser-svelte` against a real headless Chromium via `@vitest/browser-playwright` (see `app/vite.config.ts`). Interactions go through `page` locators from `vitest/browser`:

```typescript
await page.getByLabelText('Title').fill('Winter University');
await page.getByLabelText('I agree').click();
await page.getByLabelText('Merit badge').selectOptions('Camping');
```

These dispatch genuine, trusted browser events — never use `fireEvent`, `dispatchEvent(new MouseEvent(...))`, or `new Event(...)` to simulate an interaction.

**`@testing-library/user-event` does not apply to this stack and must not be added as a dependency.** `user-event` exists to make jsdom-simulated interactions behave more like a real browser. This project already tests against a real browser, so `page` locators are the direct equivalent — adding `user-event` would mean also adding jsdom + `@testing-library/svelte` as a second, less-realistic test path alongside this one.

## Assertions: default to accessible queries; `querySelector` is a named exception

Assert what a user actually perceives — sighted, screen reader, or keyboard — with `page.getByRole`/`getByText`/`getByLabelText` and `toBeVisible()`/`toBeInTheDocument()`. This is the same bet intrinsic layout makes on the markup side: correct semantic HTML and modern CSS (container queries, `:has()`, subgrid) mean the accessible role tree already carries almost everything worth asserting, with minimal nesting needed to get there. A test that has to reach past that tree into class names or DOM structure is often a sign the markup itself nests deeper than the layout needs — treat it as a prompt to check the component, not only the test.

`container.querySelector(...)` stays, but only for facts that genuinely have no accessible signal:

1. **Distinguishing two elements with the identical accessible role and name**, where the only difference is which one CSS hides.
2. **A deliberately non-accessible element** — an element with no ARIA role at all, where the whole point is that nothing is announced there.
3. **A fact about the document rather than about any one element** — for example, that no `id` appears twice. An `id` is not in the accessible tree.

Reach for `querySelector` only after confirming there is no accessible query that says the same thing — never as a shortcut past one that exists. When it is used, the surrounding comment should say which of the three cases applies, so the exception reads as deliberate rather than habitual.

## Callback props are the contract, not implementation detail

`testing-philosophy.md` says not to assert on how a mocked collaborator was called. That rule targets internal collaborators (injected services, mocked API/network calls) — asserting on _those_ couples a test to implementation.

Svelte 5 callback props (`onSave`, `onCreate`, `onConfirm`, and similar `onXxx` props passed into a component) are different: they are the component's declared public output. Asserting `expect(onSave).toHaveBeenCalledWith({ title: 'Winter University' })` after a user interaction _is_ the behavioral, user-facing assertion for that interaction — it stays.

A component that only takes props and callback props (`PeriodBoard`, `ClassForm`, `ScoutQuickAdd`) needs no module mock: its spec passes `vi.fn()` for each callback.

## Mock seam: the domain module, not `fetch`

A page calls the API through a domain module in `app/src/lib/` (`universities.ts`, `registrations.ts`, `scouts.ts`, `health.ts`, `session.svelte.ts`). A spec replaces that module. It does not replace `fetch`, `#lib/api.js`, or the Firebase SDK below it.

```typescript
const universities = vi.hoisted(() => ({
  approveUniversity: vi.fn<(fetcher: Fetcher, id: string) => Promise<void>>(),
}));
const { goto } = vi.hoisted(() => ({
  goto: vi.fn<(url: string, options?: { refreshAll?: boolean }) => Promise<void>>(),
}));
vi.mock('#lib/universities.js', () => universities);
vi.mock('$app/navigation', () => ({ goto }));
```

- **Page spec (`page.svelte.spec.ts`).** Mock each domain module that the page imports (`vi.mock('#lib/<domain>.js')`) and `$app/navigation`. Render the page with a plain `data` prop: `render(Page, { data })`. The page has the type `PageData` on that prop, so the spec needs no `$app/state` mock and does not run the `load`.
- **Data after a write.** A page calls `refreshAll()` after a write, and in the app the `load` then gives new `data`. In a spec, give the `refreshAll` mock an implementation that calls `rerender({ data })` with the new data. See `universities/[id]/page.svelte.spec.ts`.
- **Navigation.** Assert the `goto` mock with the URL and the options (`toHaveBeenCalledExactlyOnceWith('/admin/review', { refreshAll: true })`). `resolve()` from `$app/paths` is real in a spec.
- **Load spec (`page-load.spec.ts`, Node project).** Import `load` from `./+page.js`, mock the domain module, and call `load` with a plain object (`params`, `url`, `parent`). `parent` is a function that returns `{}` or calls `redirect(303, ...)` to simulate a guard. Assert the returned data, the redirect, or the error (status and message). A `load` imports `#lib/api.js`, so the spec also mocks `#lib/firebase.js`, `firebase/auth` and `$app/navigation`. See `admin/review/[id]/page-load.spec.ts`.
- **Domain call arguments.** A call of a domain function is the request that the page sends. Assert its arguments (the ID, the body) when the test is about that request. The first argument is the `Fetcher`: match it with `expect.any(Function)`.
- **No standalone specs for the fetch-wrapper modules.** `universities.ts`, `registrations.ts`, `scouts.ts`, `health.ts` and the API functions of `session.svelte.ts` have no spec of their own. The page specs and the load specs are the test of the UI boundary.
- **Pure-logic modules keep their own specs** in the Node project: `eventDatetime`, `rosterCsv`, `scheduleRules`, `periodOverlap`, `formatDate`, `emailAddress`, `returnTo`, `authErrorMessage`, `apiErrorMessage`, and `api` (the one place that calls `fetch`).

## Fixtures: one file beside the route

Fixture data that more than one spec of a route uses (the page spec and the load spec) is in one file beside them, named `<name>Fixture.ts` (`roster/rosterFixture.ts`, `admin/review/[id]/reviewFixture.ts`). Type the data with the types in `app/src/lib/api-types/`. A spec changes a fixture with a spread (`{ ...sampleDetail, classes: [] }`), not with a second full object.

## Bindable props: a getter and a setter

`$state` does not compile in a `.svelte.spec.ts` file. To test a `$bindable` prop, give `render` a property with a getter and a setter, and assert the value that the setter received. `app/src/lib/components/atoms/TextInput.svelte.spec.ts` is the reference.

```typescript
const bound = { value: '' as unknown };
await render(TextInput, {
  'aria-label': 'Title',
  get value() {
    return bound.value;
  },
  set value(next) {
    bound.value = next;
  },
});
await page.getByRole('textbox', { name: 'Title' }).fill('Winter University');
expect(bound.value).toBe('Winter University');
```

For a `children` snippet, use `htmlSnippet()` from `app/src/lib/components/testSnippet.ts`.
