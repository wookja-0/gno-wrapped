import { defineConfig } from '@playwright/test';

const PORT = 3200;
const API_PORT = 8280;

export default defineConfig({
  testDir: 'tests/e2e',
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
      command: `next dev -p ${PORT}`,
      url: `http://localhost:${PORT}`,
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
