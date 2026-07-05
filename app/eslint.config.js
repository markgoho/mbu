// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Testing-convention guards for *.spec.ts files. These encode the project's
// testing philosophy (SIFERS setup, service-boundary mocking, assert on what
// the user observes) so violations fail `ng lint` in CI instead of relying on
// reviewer memory. See ~/.claude/rules/{testing-philosophy,angular-tests}.md.
const noMockCallAssertions = {
  selector:
    "CallExpression[callee.property.name=/^toHaveBeenCalled(Once|With|Times|OnceWith|ExactlyOnceWith)?$/]",
  message:
    'Assert on what the user observes (rendered DOM, thrown message), not on how a mock was called. Test the contract, not the implementation.',
};
const noDetectChanges = {
  selector: "CallExpression[callee.property.name='detectChanges']",
  message:
    'Do not call fixture.detectChanges() in unit tests. Use TestBed.tick() to flush effects, and findBy*/waitFor to await DOM updates.',
};
const noTestHooks = {
  selector: "CallExpression[callee.name=/^(beforeEach|afterEach|beforeAll|afterAll)$/]",
  message:
    'Prefer a SIFERS setup() function over beforeEach/afterEach hooks — centralize construction and reset state fresh per test.',
};
const noManualAsyncFlush = {
  selector: "CallExpression[callee.name='setTimeout']",
  message:
    'Do not hand-roll async flushing with setTimeout/new Promise. findBy*/waitFor from @testing-library/angular already poll until the assertion passes.',
};

export default defineConfig([
  {
    files: ['**/*.ts'],
    ...eslint.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: ['**/*.ts'],
  })),
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['element', 'attribute'],
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.routes.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },
  {
    files: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http/testing',
              message:
                'Mock at the service boundary with fakeResource (test-utils/fake-resource), not HttpTestingController. The service is the boundary under test, not the transport it uses internally.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        noMockCallAssertions,
        noDetectChanges,
        noTestHooks,
        noManualAsyncFlush,
      ],
    },
  },
  {
    // HTTP interceptors operate at the transport layer — below any service seam
    // and with no DOM to assert against — so driving real requests through them
    // (HttpTestingController), inspecting the resulting request/spies, and
    // flushing the async token step are the correct tools. They stay held to
    // the SIFERS setup() and no-detectChanges conventions.
    files: ['**/*.interceptor.spec.ts'],
    rules: {
      'no-restricted-imports': 'off',
      'no-restricted-syntax': ['error', noDetectChanges, noTestHooks],
    },
  },
  ...angular.configs.templateRecommended.map((config) => ({
    ...config,
    files: ['**/*.html'],
  })),
  {
    files: ['e2e/**/*.ts'],
    ...eslint.configs.recommended,
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
]);
