import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const TEST_DB = process.env.TEST_DATABASE_URL ?? 'postgresql://reset:reset_dev@localhost:5432/reset_test?schema=public';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['list']],
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure', launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM ?? '/opt/pw-browsers/chromium' } },
  projects: [
    { name: 'desktop', testIgnore: /mobile\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', testMatch: /mobile\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    // A local stand-in for Paystack (test only). It proves nothing about live payments.
    { command: 'npx tsx tests/support/mock-paystack.ts', port: 4016, reuseExistingServer: false, timeout: 60_000, env: { MOCK_PAYSTACK_PORT: '4016', PAYSTACK_SECRET_KEY: 'sk_test_mock', MOCK_WEBHOOK_URL: `http://localhost:${PORT}/api/webhooks/paystack` } },
    {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      SITE_MODE: 'demo',
      PAYSTACK_SECRET_KEY: 'sk_test_mock',
      PAYSTACK_API_BASE: 'http://localhost:4016',
      INTEGRATIONS_ALLOW_LOCAL: '1',
      DATABASE_URL: TEST_DB,
      APP_SECRET: 'e2e-secret-e2e-secret-e2e-secret-123456',
      APP_URL: `http://localhost:${PORT}`,
      STORAGE_DIR: '/tmp/reset-e2e-storage',
      AUTH_REQUIRE_EMAIL_VERIFICATION: 'false',
      CRON_SECRET: 'e2e-cron-secret',
      NODE_ENV: 'test', // the only mode in which the app will talk to the local Paystack stand-in (see assertSafeUrl); never use it for a real deployment
    },
    },
  ],
});
