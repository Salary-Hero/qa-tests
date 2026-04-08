import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config()

const ENV = process.env.ENV ?? 'dev'

const baseURLs: Record<string, string> = {
  dev: 'https://apiv2-dev.salary-hero.com',
  staging: 'https://apiv2-staging.salary-hero.com',
  prod: 'https://apiv2.salary-hero.com',
}

const adminURLs: Record<string, string> = {
  dev: 'https://backoffice-salary-hero-dev.web.app',
  staging: 'https://backoffice-salary-hero-test.web.app',
  prod: 'https://backoffice-salary-hero.web.app',
}

const hrURLs: Record<string, string> = {
  dev: 'https://console-salary-hero-dev.web.app',
  staging: 'https://console-salary-hero-test.web.app',
  prod: 'https://console-salary-hero.web.app',
}

const otpCodes: Record<string, string> = {
  dev: '111111',
  staging: '199119',
  prod: '',
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

export { baseURLs, adminURLs, hrURLs, otpCodes, ENV }
