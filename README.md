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

Edit `.env` and set `ENV` to your target environment (`dev`, `staging`, or `prod`).

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

| Variable      | Default  | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `ENV`         | `dev`    | Target environment: `dev`, `staging`, `prod` |
| `APP_VERSION` | `10.0.0` | Value sent in `x-app-version` header         |

OTP codes are resolved automatically from `playwright.config.ts` based on `ENV`:

| ENV     | OTP      |
| ------- | -------- |
| dev     | `111111` |
| staging | `199119` |

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

Each API test follows this pattern:

1. `beforeEach` — seed an employee via the admin API
2. Run the test
3. `afterEach` — clean up the signup record first, then delete the employee

Cleanup order matters: the signup record must be removed before the employee is deleted.

## Type checking

```bash
yarn tsc
```
