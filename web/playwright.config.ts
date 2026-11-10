import { defineConfig } from '@playwright/test';

const PORT = 3200;
const API_PORT = 8280;
// E2E_PROD=1 (CI): test a production build. The dev server compiles each route on its first request,
// which on a 4-core runner made most of a 3-minute run; a build takes about a minute, once.
const PROD = !!process.env.E2E_PROD;

export default defineConfig({
  testDir: 'tests/e2e',
  // Tests run in parallel one by one, not file by file: with two spec files, file by file meant two
  // workers at most. Every test opens its own context, so they don't share state.
  fullyParallel: true,
  workers: process.env.CI ? 4 : undefined, // GitHub's runners have 4 cores; Playwright's default is half
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome', // system Chrome; no browser download needed
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
  },
  webServer: [
    {
      // Backend: serves ../data/out if the batch has run; unknown addresses are 404 either way.
      command: 'go run .',
      cwd: '../api',
      url: `http://localhost:${API_PORT}/healthz`,
      reuseExistingServer: false,
      env: { LISTEN_ADDR: `:${API_PORT}`, DATA_DIR: '../data/out' },
    },
    {
      command: PROD ? `next build && next start -p ${PORT}` : `next dev -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      timeout: PROD ? 240_000 : 60_000,
      reuseExistingServer: false,
      env: {
        WRAPPED_API_URL: `http://localhost:${API_PORT}`,
        WRAPPED_FIXTURES: '1',
        NEXT_PUBLIC_WRAPPED_FIXTURES: '1',
        NEXT_PUBLIC_SHARE_BASE_URL: `http://localhost:${PORT}`,
      },
    },
  ],
});
