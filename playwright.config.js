import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://localhost:4173/the-chopping-block/'

// The real user is on Android (Chrome); the developer tests on iPhone (Safari). Run both engines.
export default defineConfig({
  testDir: 'tests/e2e',
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'], baseURL } },
    { name: 'pixel-chromium', use: { ...devices['Pixel 7'], baseURL } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
