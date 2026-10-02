import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import unicorn from 'eslint-plugin-unicorn';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
  includeIgnoreFile(gitignorePath),
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
      // The API types use `null`, so the fixtures and the request bodies must use it too (#233).
      'unicorn/no-null': 'off',
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
    // These specs moved from the Angular app with only their imports changed (#232).
    files: ['src/lib/rosterCsv.spec.ts', 'src/lib/scheduleRules.spec.ts'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/max-nested-calls': 'off',
      'unicorn/prefer-split-limit': 'off',
    },
  },
  {
    // SvelteKit sets the route file names (+page.svelte, +layout.ts, [param]/).
    files: ['src/routes/**'],
    rules: {
      'unicorn/filename-case': 'off',
    },
  },
  {
    // Pages use the atoms, not the native elements, so that #102 can style each control in one place (#233).
    files: ['**/*.svelte'],
    ignores: ['src/lib/components/atoms/*.svelte'],
    rules: {
      'svelte/no-restricted-html-elements': [
        'error',
        {
          elements: ['button'],
          message:
            'Use the Button atom (#lib/components/atoms/Button.svelte), not a raw <button> element.',
        },
        {
          elements: ['a'],
          message: 'Use the Link atom (#lib/components/atoms/Link.svelte), not a raw <a> element.',
        },
        {
          elements: ['select'],
          message:
            'Use the Select atom (#lib/components/atoms/Select.svelte), not a raw <select> element.',
        },
        {
          elements: ['textarea'],
          message:
            'Use the Textarea atom (#lib/components/atoms/Textarea.svelte), not a raw <textarea> element.',
        },
        {
          elements: ['input'],
          message:
            'Use the TextInput atom (#lib/components/atoms/TextInput.svelte) or the Checkbox atom (#lib/components/atoms/Checkbox.svelte), not a raw <input> element. A radio input and a file input have no atom: disable this rule on that line, with a comment that gives the reason.',
        },
      ],
    },
  },
);
