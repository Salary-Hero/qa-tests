import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

const ENV = process.env.ENV ?? 'dev'
const KNOWN_ENVS = ['dev', 'staging']
if (!KNOWN_ENVS.includes(ENV)) {
  throw new Error(`Unknown ENV: "${ENV}". Must be one of: ${KNOWN_ENVS.join(', ')}`)
}

// Kept local to playwright.config.ts — importing from shared/utils/env.ts would
// cause env.ts to execute before dotenv.config() runs here.
const baseURLs: Record<string, string> = {
  dev: 'https://apiv2-dev.salary-hero.com',
  staging: 'https://apiv2-staging.salary-hero.com',
}

const adminURLs: Record<string, string> = {
  dev: 'https://backoffice-salary-hero-dev.web.app',
  staging: 'https://backoffice-salary-hero-test.web.app',
}

const hrURLs: Record<string, string> = {
  dev: 'https://console-salary-hero-dev.web.app',
  staging: 'https://console-salary-hero-test.web.app',
}

export default defineConfig({
  testIgnore: '**/node_modules/**',
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // --- API project ---
    {
      name: 'api',
      testDir: './api/tests',
      testIgnore: '**/_template.test.ts',
      timeout: 60000,
      use: {
        baseURL: baseURLs[ENV],
        extraHTTPHeaders: {
          'x-app-version': process.env.APP_VERSION ?? '10.0.0',
          'Content-Type': 'application/json',
        },
      },
    },

    // --- UI: Admin (Backoffice) ---
    {
      name: 'admin',
      testDir: './ui/admin/tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: adminURLs[ENV],
        headless: true,
        viewport: { width: 1440, height: 900 },
      },
    },

    // --- UI: HR Console ---
    {
      name: 'hr',
      testDir: './ui/hr/tests',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: hrURLs[ENV],
        headless: true,
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
})


