import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:4178/circuitforge-lab/',
    viewport: { width: 1536, height: 960 },
    headless: true,
    channel: process.env.CI ? undefined : 'chrome',
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4178 --strictPort',
    url: 'http://127.0.0.1:4178/circuitforge-lab/',
    reuseExistingServer: true,
  },
  reporter: [['list']],
});
