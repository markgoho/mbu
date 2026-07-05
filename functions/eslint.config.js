import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// Architecture + testing guards for the Elysia API modules. These encode the
// conventions in docs/adr/0001-api-module-architecture.md (and
// ~/.claude/rules/{elysia,testing-philosophy,firebase-functions-testing}.md) so
// violations fail `npm run lint` in CI instead of relying on reviewer memory.
// See also `npm run check:arch` for the structural checks ESLint can't express
// (tests must live in routes/, every *-api module needs routes/ + plugins/).

// Services and collaborators are plain object literals typed to their
// interface (`export const XServiceImpl: X = { … }`), not classes. `implements`
// is the tell — `class Foo extends Error` (our HttpError hierarchy) is fine.
const noServiceClasses = {
  selector: "ClassDeclaration:has(TSClassImplements)",
  message:
    "Services must be plain object literals typed to their interface (export const XImpl: X = { … }), not classes. Call getFirestore() inline and take cross-cutting deps as params. See docs/adr/0001-api-module-architecture.md.",
};

// Assert on the HTTP response (status/body), not on how a mocked service was
// called — test the contract, not the implementation.
const noMockCallAssertions = {
  selector:
    "CallExpression[callee.property.name=/^toHaveBeenCalled(Once|With|Times|OnceWith|ExactlyOnceWith)?$/]",
  message:
    "Assert on the HTTP response (status/body), not on how a mock was called. Test the contract, not the implementation.",
};

// Prefer a SIFERS setup() per describe block over shared lifecycle hooks.
const noTestHooks = {
  selector:
    "CallExpression[callee.name=/^(beforeEach|afterEach|beforeAll|afterAll)$/]",
  message:
    "Prefer a SIFERS setup() function over beforeEach/afterEach hooks — centralize construction and reset state fresh per test.",
};

// Never mock firebase-admin internals; inject and mock the service interface at
// the plugin boundary via a create*TestPlugin factory instead.
const noFirebaseAdminMock = {
  selector:
    "CallExpression[callee.object.name='mock'][callee.property.name='module'] Literal[value=/firebase-admin/]",
  message:
    "Never mock firebase-admin internals. Mock the service interface at the plugin boundary (create*TestPlugin), not the transport it uses.",
};

export default defineConfig([
  {
    ignores: ["lib/**"],
  },
  {
    files: ["**/*.ts"],
    ...eslint.configs.recommended,
  },
  ...tseslint.configs.recommended.map(config => ({
    ...config,
    files: ["**/*.ts"],
  })),
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        // tsconfig.test.json includes all of src (source + *.test.ts) with the
        // same compiler options, so every linted .ts file is in the project.
        project: ["./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-restricted-syntax": ["error", noServiceClasses],
    },
  },
  {
    // Boundary tests only: drive the plugin through handle(), mock services at
    // the seam, assert on the response. (Enforced test location: routes/ — see
    // `npm run check:arch`.)
    files: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        noServiceClasses,
        noMockCallAssertions,
        noTestHooks,
        noFirebaseAdminMock,
      ],
    },
  },
]);
