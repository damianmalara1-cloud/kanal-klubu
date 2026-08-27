import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  use: { baseURL: 'http://localhost:3000', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MOCK_EXTERNAL: 'true', AI_MOCK: 'true',
      APP_URL: 'http://localhost:3000',
      COACH_LINK_SECRET: 'test-secret-1234567890',
      COACH_NAMES: 'Ania,Krzysiek',
      TEAMS: 'młodziczki (2011+);młodzicy (2011+);dziewczęta 2013+',
      KLUB_PRO_TEAMS: 'młodziczki (2011+);młodzicy (2011+)',
      TELEGRAM_CHAT_ID: '1', PARTNER_INFO_ENABLED: 'false', PUBLISH_MODE: 'unpublished',
    },
  },
});
