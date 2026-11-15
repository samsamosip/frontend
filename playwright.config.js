import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 20000,
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: ['chromium', 'webkit'].map((browserName) => ({
    name: browserName,
    use: { ...devices['iPhone 13'], browserName, viewport: { width: 390, height: 844 } },
  })),
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    env: { VITE_API_URL: 'http://127.0.0.1:5175' },
  },
});
