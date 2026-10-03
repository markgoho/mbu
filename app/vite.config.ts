import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Date and time specs assert on wall-clock output, so both Vitest projects run
// in one fixed timezone and do not depend on the machine.
const TEST_TIMEZONE = 'America/New_York';

// The dev server sends each `/api` call to the Go API that `bun run dev:platform`
// (repo root) starts on port 8080 (#246).
const API_TARGET = 'http://localhost:8080';

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, but not for libraries. Remove this in Svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      // A client-side SPA with no SSR (see src/routes/+layout.ts). Firebase
      // Hosting rewrites each unknown path to `200.html` (see firebase.json).
      adapter: adapter({ fallback: '200.html' }),
    }),
  ],
  server: {
    port: 4200,
    strictPort: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'client',
          browser: {
            enabled: true,
            provider: playwright({ contextOptions: { timezoneId: TEST_TIMEZONE } }),
            instances: [{ browser: 'chromium', headless: true }],
          },
          include: ['src/**/*.svelte.spec.ts'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          env: { TZ: TEST_TIMEZONE },
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.svelte.spec.ts'],
        },
      },
    ],
  },
});
