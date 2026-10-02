import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, globalIgnores, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  // The Playwright suite is not ported yet. #238 owns it and removes this ignore.
  globalIgnores(['e2e/**']),
  js.configs.recommended,
  ts.configs.recommended,
  svelte.configs.recommended,
  unicorn.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // typescript-eslint recommends that TypeScript projects do not use no-undef.
      // See https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
      'no-undef': 'off',
      // The file name case depends on the directory: camelCase, kebab-case, and PascalCase (Svelte components).
      'unicorn/filename-case': [
        'error',
        { cases: { camelCase: true, pascalCase: true, kebabCase: true } },
      ],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions: ['.svelte'],
        parser: ts.parser,
      },
    },
    rules: {
      // Svelte 5 runes assign to top-level `$state` from event handlers by design.
      'unicorn/no-top-level-assignment-in-function': 'off',
    },
  },
  {
    // These files are the API contract, moved from the Angular app with no changes (#230).
    files: ['src/lib/api-types/**'],
    rules: {
      'unicorn/single-line-block-comment-style': 'off',
    },
  },
  {
    // SvelteKit sets the route file names (+page.svelte, +layout.ts, [param]/).
    files: ['src/routes/**'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
);
