# qa-tests

Unified test suite for Salary Hero — API and UI tests using [Playwright](https://playwright.dev/) and TypeScript.

## Projects

| Project | What it tests         | Base URL (dev)                               |
| ------- | --------------------- | -------------------------------------------- |
| `api`   | REST API endpoints    | `https://apiv2-dev.salary-hero.com`          |
| `admin` | Backoffice (Admin UI) | `https://backoffice-salary-hero-dev.web.app` |
| `hr`    | HR Console (UI)       | `https://console-salary-hero-dev.web.app`    |

## Prerequisites

- Node.js 18+
- [Yarn](https://yarnpkg.com/)

## Setup

```bash
yarn install
cp .env.example .env
```

Edit `.env` and set `ENV` to your target environment (`dev` or `staging`).

## Running tests

```bash
# API tests
yarn test:api              # dev
yarn test:api:staging      # staging

# Admin UI tests
yarn test:admin            # dev
yarn test:admin:staging    # staging

# HR Console UI tests
yarn test:hr               # dev
yarn test:hr:staging       # staging

# All projects
yarn test:all

# Open HTML report after a run
yarn report
```

## Environment variables

### General
| Variable      | Default  | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `ENV`         | `dev`    | Target environment: `dev` or `staging`       |
| `APP_VERSION` | `10.0.0` | Value sent in `x-app-version` header         |

OTP codes are resolved automatically from `playwright.config.ts` based on `ENV`:

| ENV     | OTP      |
| ------- | -------- |
| dev     | `111111` |
| staging | `199119` |

### Database (Test Data Management)
| Variable          | Required | Description                                         |
| ----------------- | -------- | --------------------------------------------------- |
| `DB_HOST`         | ✓        | RDS host — shared between dev and staging           |
| `DB_PORT`         | ✓        | Database port (default: 5432)                       |
| `DB_NAME_DEV`     | ✓        | Dev database name                                   |
| `DB_NAME_STAGING` | ✓        | Staging database name                               |
| `DB_USER`         | ✓        | Database user                                       |
| `DB_PASSWORD`     | ✓        | Database password                                   |

## Project structure

```
api/
  helpers/      # Reusable functions (API calls, seed/cleanup logic)
  schema/       # Zod schemas for validating API response shapes
  tests/        # API test specs

ui/
  admin/
    pages/      # Page Object Model classes for the Backoffice UI
    tests/      # Admin UI test specs
  hr/
    pages/      # Page Object Model classes for the HR Console UI
    tests/      # HR Console UI test specs

shared/
  fixtures/     # Static test data (JSON files, constants)
  utils/        # Shared utilities (env helpers, request wrappers, schema validation)
```

> **Naming convention:**
>
> - `helpers/` — functions (API wrappers, setup/teardown)
> - `fixtures/` — static data only (JSON, plain constants)
> - `schema/` — Zod validation schemas
> - `pages/` — POM classes for UI tests

## Test data lifecycle (API tests)

Every API test follows a four-step pattern managed automatically by the seed profile system:

1. **Seed** — `beforeEach` creates a fresh employee under the QA test company
2. **Test** — the test calls the API and asserts the response
3. **Verify** — assertions check response fields and (where relevant) DB state
4. **Cleanup** — `afterEach` hard-deletes the employee from the database

### Using the seed & teardown pattern

```typescript
import { test, expect } from '@playwright/test'
import { setupSeedTeardown } from '../../helpers/test-setup'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import { requestPhoneOtp } from '../../helpers/phone-signup-api'

test.describe('Signup by Phone', () => {
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test(
    'API – Signup Phone – Full signup flow – Success',
    { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
    async ({ request }) => {
      const ctx = getContext()
      const phone = ctx.identifiers.phone!

      await test.step('Request OTP', async () => {
        const refCode = await requestPhoneOtp(request, phone)
        expect(refCode).toBeTruthy()
      })
    }
  )
})
```

Key points:
- `setupSeedTeardown(profile)` wires up `beforeEach` / `afterEach` automatically — no manual try/finally
- `getContext()` gives you the seeded employee's `identifiers` (phone, email, employee_id) and `company`
- `phoneSignupProfile` is one of several profiles in `api/helpers/profiles/` — one per auth method
- Cleanup always uses hard delete so phone numbers are freed for the next run

See `docs/API_TESTING_GUIDE.md` for a full walkthrough, or `api/tests/_template.test.ts` for a ready-to-copy starting point.

### Available seed profiles

| Profile | Auth method | Company from seed-config |
|---|---|---|
| `phoneSignupProfile` | Phone OTP | `getCompany('phone')` |
| `lineSignupProfile` | LINE | `getCompany('line')` |
| `employeeIdSignupProfile` | Employee ID + national ID | `getCompany('employee_id')` |

### Cleanup script

If a test run crashes and leaves orphaned data:

```bash
yarn cleanup:dev          # preview — shows what would be deleted
yarn cleanup:dev --force  # delete without prompting
yarn cleanup:staging --force
```

## Type checking

```bash
yarn tsc
```
