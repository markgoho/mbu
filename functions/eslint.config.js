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

// Tests are per-route boundary tests living in a routes/ directory. A test file
// anywhere else (a whole-app app.test.ts, a standalone service-layer test) is a
// convention violation regardless of its contents, so flag the whole file.
const testFileOutsideRoutes = {
  selector: "Program",
  message:
    "Tests must be per-route boundary tests inside a routes/ directory — no whole-app app.test.ts, no service-layer tests. Drive the plugin via handle() with mocked services. See docs/adr/0001-api-module-architecture.md.",
};

// Content rules that apply to every test file wherever it lives.
const testContentRules = [
  noServiceClasses,
  noMockCallAssertions,
  noTestHooks,
  noFirebaseAdminMock,
];

// Emulators/test harnesses have no place in these unit tests — mock at the
// boundary. (Firestore *rules* tests, if ever added, live under firestore/ with
// their own emulator script, not in functions/src.)
const noEmulatorImports = [
  {
    name: "firebase-functions-test",
    message:
      "No Functions emulator/harness in unit tests — drive the plugin via handle() with mocked services (create*TestPlugin).",
  },
  {
    name: "@firebase/rules-unit-testing",
    message:
      "No emulator in unit tests — mock services at the boundary. Firestore rules tests belong under firestore/, not functions/src.",
  },
];

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
    // Every test file: content rules + no emulator imports.
    files: ["**/*.test.ts"],
    rules: {
      "no-restricted-syntax": ["error", ...testContentRules],
      "no-restricted-imports": ["error", { paths: noEmulatorImports }],
    },
  },
  {
    // Test files NOT under a routes/ directory are misplaced by definition —
    // flag the file location on top of the content rules. (Ordered after the
    // block above so this rule set wins for these files.)
    files: ["**/*.test.ts"],
    ignores: ["**/routes/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        testFileOutsideRoutes,
        ...testContentRules,
      ],
    },
  },
]);
