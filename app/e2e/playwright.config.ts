import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const rootDirectory = path.resolve(import.meta.dirname, '../..');

export default defineConfig({
  testDir: './tests',
  // Tests can run in parallel - each test mocks its own API responses
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  ...(process.env['CI'] && { workers: 2 }),
  reporter: [['html', { outputFolder: '../playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start Angular dev server and the Auth emulator only.
  // - Angular connects to the Auth emulator for real authentication.
  // - All API (/api/*) calls are mocked via Playwright page.route() - NO Functions/Firestore emulator reliance.
  // - --configuration=e2e uses an empty proxy config so Playwright can intercept API calls.
  webServer: [
    {
      // Firebase Auth emulator only (no Firestore, no Functions)
      command:
        'firebase emulators:start --only auth --project merit-badge-university',
      cwd: rootDirectory,
      url: 'http://localhost:9099',
      reuseExistingServer: !process.env['CI'],
      timeout: 60_000,
    },
    {
      // Angular dev server connecting to the Auth emulator
      command: 'cd app && ng serve --configuration=e2e',
      cwd: rootDirectory,
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
