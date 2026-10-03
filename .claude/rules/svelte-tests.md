---
paths:
  - "app/src/**/*.spec.ts"
---

# Svelte Test Conventions (Vitest + vitest-browser-svelte)

Rules for `app/src/**/*.spec.ts`. This glob includes `*.svelte.spec.ts`. The rules add to the general SIFERS principles in `~/.claude/rules/testing-philosophy.md` (DRY, hide mechanics, explicit parameters, behavioral focus). Where the two files do not agree, this file wins, because that file was written for a different stack.

Vitest has two projects (`app/vite.config.ts`). The file name selects the project:

- `client`: `*.svelte.spec.ts`. Real headless Chromium through `vitest-browser-svelte` and `@vitest/browser-playwright`. Component specs (`<Name>.svelte.spec.ts`), page specs (`page.svelte.spec.ts`) and the specs of `.svelte.ts` modules (`formAction.svelte.spec.ts`) are in this project.
- `server`: all other `*.spec.ts`. Node. Pure-logic specs and `load` specs (`page-load.spec.ts`, `<group>-layout-load.spec.ts`) are in this project.

Each spec is beside the file that it tests. Each test must have an assertion (`requireAssertions`). The Playwright smoke suite (`app/e2e/*.e2e.ts`) is not in the scope of this file: see "E2E specs" in `app/README.md`.

## SIFERS: one `setup()` per `describe` block

Use a `setup()` function, not `beforeEach` and not a `render()` call in each test. `setup()` makes the props, gives each test a happy-path default, and returns only what the test uses for its actions and assertions. `render()` registers its own cleanup, so `setup()` does not return a teardown handle.

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
    approveError: new ApiError(409, { code: 'CONFLICT', message: 'Add a class first.' }),
  });
  await approveButton.click();
  await expect.element(page.getByRole('alert')).toHaveTextContent('Add a class first.');
});
```

- `render()` of `vitest-browser-svelte@3` is async. Thus `setup()` of a component spec is `async`, and each call has `await`.
- `setup()` resets each mock that it configures (`mockReset()`), so that a test does not get the calls of an earlier test.
- Put `setup()` at module scope. `unicorn/consistent-function-scoping` refuses a function in a `describe` block that uses nothing from that block. A file with two `describe` blocks that need different setups has two functions with different names, one for each block.
- A helper that more than one test uses to find an element is a function beside `setup()`, or a locator that `setup()` returns.
- A spec that is a table of pure-function assertions (`expect(fn(x)).toBe(y)`) needs no `setup()`.

## Interactions: use `page` locators, never `fireEvent`/`dispatchEvent`

The `client` project runs in a real browser. Do each interaction through a `page` locator from `vitest/browser`:

```typescript
await page.getByLabelText('Title').fill('Winter University');
await page.getByRole('checkbox', { name: 'I agree' }).click();
await page.getByLabelText('Merit badge').selectOptions('Camping');
```

These locators send real, trusted browser events. Do not use `fireEvent`, `dispatchEvent(new MouseEvent(...))` or `new Event(...)` to simulate an interaction.

Do not add `@testing-library/user-event`, `@testing-library/svelte` or `jsdom`. `user-event` makes simulated events in jsdom more like those of a browser. These specs already run in a browser, so `page` locators do that job.

## Assertions: accessible queries first; DOM access is an exception with a comment

Assert what a user perceives, with `page.getByRole`, `getByText` or `getByLabelText`, and `expect.element(...)` with `toBeVisible()`, `toHaveTextContent()` and the related matchers. Correct semantic HTML puts almost all facts in the accessible role tree. If a test must use a class name or the DOM structure, examine the markup of the component first: the markup is frequently the problem.

Direct DOM access (`container.querySelector(...)`, `locator.element()`) is permitted only for a fact that has no accessible query:

1. Two elements have the same role and name, and only CSS shows which one is visible.
2. The element has no role on purpose, so that nothing is announced there.
3. The fact is about the document or the browser state, not about the content of one element. Examples: no `id` occurs two times; a `<dialog>` is open as a modal (`.element().matches(':modal')` in `ConfirmDialog.svelte.spec.ts`).

When a spec uses direct DOM access, write a comment that says which case applies.

## Callback props are the contract, not implementation detail

`testing-philosophy.md` says: do not assert how a mocked collaborator was called. That rule is for internal collaborators.

A Svelte 5 callback prop (`onSave`, `onCreate`, `onConfirm`) is different. It is the public output of the component. The assertion `expect(onSave).toHaveBeenCalledWith({ title: 'Winter University' })` after a user interaction is the behavioral assertion for that interaction. Keep it.

A component that takes only props and callback props (`PeriodBoard`, `ClassForm`, `ScoutQuickAdd`) needs no module mock. Its spec passes `vi.fn()` for each callback.

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
- **Pure-logic modules keep their own specs** in the Node project: `eventDatetime`, `rosterCsv`, `scheduleRules`, `periodOverlap`, `formatDate`, `emailAddress`, `returnTo`, `authErrorMessage`, `apiErrorMessage`, `disclaimer`, and `api` (the one place that calls `fetch`).

## Fixtures: one file beside the route

Fixture data that more than one spec of a route uses (the page spec and the load spec) is in one file beside them, named `<name>Fixture.ts` (`roster/rosterFixture.ts`, `admin/review/[id]/reviewFixture.ts`). Type the data with the types in `app/src/lib/api-types/`. A spec changes a fixture with a spread (`{ ...sampleDetail, classes: [] }`), not with a second full object.

## Bindable props: a getter and a setter

`render` takes a plain props object, and there is no parent component to write `bind:value`. To test a `$bindable` prop, give `render` a property with a getter and a setter, and assert the value that the setter received. Do not write a wrapper component for this. `app/src/lib/components/atoms/TextInput.svelte.spec.ts` is the reference.

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
