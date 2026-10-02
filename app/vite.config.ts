import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Date and time specs assert on wall-clock output, so both Vitest projects run
// in one fixed timezone and do not depend on the machine.
const TEST_TIMEZONE = 'America/New_York';

// The local Functions emulator serves one Cloud Function for each API domain,
// so each path prefix has its own target. Do not collapse these into one
// `/api` entry (#228, decision 10).
const FUNCTIONS_EMULATOR = 'http://localhost:5001/merit-badge-university/us-east4';

function functionProxy(functionName: string) {
  return { target: `${FUNCTIONS_EMULATOR}/${functionName}`, changeOrigin: true, secure: false };
}

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
      '/api/health': functionProxy('healthApi'),
      '/api/users': functionProxy('usersApi'),
      '/api/universities': functionProxy('universitiesApi'),
      '/api/admin/universities': functionProxy('universitiesApi'),
      '/api/registrations': functionProxy('registrationsApi'),
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
