import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
  },
  // Yerelde makinedeki Chrome kullanılır; CI'da Playwright'ın Chromium'u kurulur.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' },
    },
  ],
  webServer: {
    command: `npx tsx scripts/e2e-prepare.ts && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/saglik`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: '',
      DATABASE_URL_UNPOOLED: '',
      BLOB_READ_WRITE_TOKEN: '',
      LOCAL_DB_DIR: '.e2e/db',
      UPLOAD_DIR: '.e2e/uploads',
      SITE_URL: `http://localhost:${PORT}`,
    },
  },
});
