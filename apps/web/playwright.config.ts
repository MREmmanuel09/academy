import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One retry on local for the cross-page navigation tests that
  // sometimes flake on a cold start. CI bumps to 2 retries.
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // `next dev` corrupts the prerender manifest under Next 15.5 in this
    // workspace (we hit a "JSON position 1318" parse error during page
    // evaluation). The production server is deterministic for E2E and
    // still runs the real app, so we use it. Build the app once via
    // `pnpm run build` before invoking playwright (see apps/web/scripts
    // notes in the README).
    command: 'pnpm run start',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // The suite registers one user per test from a single IP, which
    // would trip the register bucket (3/hour/IP). The bypass is
    // opt-in and only affects the server Playwright spawns.
    env: {
      E2E_BYPASS_RATE_LIMIT: '1',
    },
  },
});
