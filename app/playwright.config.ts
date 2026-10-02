import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const rootDirectory = path.resolve(import.meta.dirname, '..');

const AUTH_EMULATOR_HOST = 'localhost:9099';
// The default port of `vite preview`. The dev server (`bun run dev`) uses 4200,
// so a dev server that runs at the same time does not get in the way.
const PREVIEW_PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // The specs can run in parallel: each test has its own emulator account and its own API mocks.
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  ...(process.env['CI'] && { workers: 2 }),
  // `html` writes `playwright-report/`, which the CI job uploads.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PREVIEW_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // The suite needs two servers and no more (#228, decision 9):
  // - The Firebase Auth emulator, for real sign-up and sign-in.
  // - The preview of the static build. It has no `/api` proxy: each spec mocks
  //   its `/api/*` calls with `page.route()` (see `e2e/fixtures/auth.fixture.ts`).
  // There is no Functions emulator and no Firestore emulator.
  webServer: [
    {
      // The `firebase` CLI is a dependency of the repo root, not of `app/`.
      command: `${path.join(rootDirectory, 'node_modules/.bin/firebase')} emulators:start --only auth --project merit-badge-university`,
      cwd: rootDirectory,
      url: `http://${AUTH_EMULATOR_HOST}`,
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      command: `bun run build && bun run preview --port ${PREVIEW_PORT} --strictPort`,
      port: PREVIEW_PORT,
      // Vite puts `VITE_*` values into the bundle at build time, so the build
      // must have the emulator host, not only the preview. For the same reason
      // the suite does not use a preview server that runs already: its build
      // can be one that connects to the real Firebase project.
      env: { VITE_FIREBASE_AUTH_EMULATOR_HOST: AUTH_EMULATOR_HOST },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
