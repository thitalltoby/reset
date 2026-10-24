// Integration tests run against a dedicated database. Never point this at development or production data.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://reset:reset_dev@localhost:5432/reset_test?schema=public';
process.env.APP_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.APP_URL = 'http://localhost:3000';
process.env.STORAGE_DIR = '/tmp/reset-test-storage';
process.env.AUTH_REQUIRE_EMAIL_VERIFICATION = 'true';
process.env.RESEND_API_KEY = '';
process.env.SMTP_HOST = '';
(process.env as Record<string, string>).NODE_ENV = 'test';
process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
process.env.PAYSTACK_API_BASE = 'http://localhost:4015';
process.env.INTEGRATIONS_ALLOW_LOCAL = '1';
process.env.SITE_MODE = 'demo';
