import { defineConfig } from '@playwright/test';

/**
 * Real-Chrome E2E. Launches Chromium with the built extension loaded and drives
 * it against the local test bench (test-api :4000 + test-app :3000).
 *
 * Requires a prior `yarn build` so ./dist exists. In CI, run under xvfb:
 *   xvfb-run -a yarn test:e2e
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  webServer: [
    {
      command: 'node test/test-api/server.mjs',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
    {
      command: 'node test/test-app/serve.mjs',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
  ],
});
