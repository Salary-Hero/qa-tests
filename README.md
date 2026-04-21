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

### General
| Variable      | Default  | Description                                  |
| ------------- | -------- | -------------------------------------------- |
| `ENV`         | `dev`    | Target environment: `dev`, `staging`, `prod` |
| `APP_VERSION` | `10.0.0` | Value sent in `x-app-version` header         |

OTP codes are resolved automatically from `playwright.config.ts` based on `ENV`:

| ENV     | OTP      |
| ------- | -------- |
| dev     | `111111` |
| staging | `199119` |

### Database (Test Data Management)
| Variable     | Required | Description                    |
| ------------ | -------- | ------------------------------ |
| `DB_HOST`    | ✓        | Database host (e.g., localhost) |
| `DB_PORT`    | ✓        | Database port (default: 5432)  |
| `DB_NAME`    | ✓        | Database name (e.g., showhire_dev) |
| `DB_USER`    | ✓        | Database user                  |
| `DB_PASSWORD`| ✓        | Database password              |

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

### Overview
Tests use a dev database with reusable test company (Company ID: 128 - "QA - Phone Signup Only") and automatic cleanup of created employee records.

**Pattern:**
1. **Setup** — Create test employee under shared company using database
2. **Test** — Call API endpoint
3. **Verify** — Check API response and database state
4. **Cleanup** — Delete created employee and user records (company remains intact)

### Using Test Fixtures

Every API test should follow this pattern:

```typescript
import { test } from '@playwright/test';
import { useTestContext, useTestCleanup } from '../../shared/test-fixtures';
import { createFullEmployee } from '../../shared/test-data';
import { TEST_COMPANY_IDS } from '../../shared/constants';

test('update employee detail', async ({ request }) => {
  // Initialize test context
  const context = await useTestContext(TEST_COMPANY_IDS.defaultCompany);
  const cleanup = await useTestCleanup(context);

  try {
    // SETUP: Create test data
    const employee = await createFullEmployee(
      context,
      TEST_COMPANY_IDS.defaultCompany,
      {
        firstName: 'John',
        lastName: 'Doe',
      }
    );

    // TEST: Call API
    const response = await request.patch(
      `/api/employees/${employee.employment_id}`,
      { data: { firstName: 'Jane' } }
    );

    // VERIFY: Check response
    expect(response.status()).toBe(200);

  } finally {
    // CLEANUP: Delete created records automatically
    await cleanup();
  }
});
```

### Key Functions

#### Test Setup
- `useTestContext(companyId)` — Initialize test with company ID
- `useTestCleanup(context)` — Register automatic cleanup
- `createFullEmployee(context, companyId, options)` — Create employee under company

#### Test Data Helpers
- `getCompanyById(companyId)` — Fetch company from database
- `getEmploymentById(employmentId)` — Fetch employment record
- `getUserById(userId)` — Fetch user record
- `getUserIdentityByUid(userUid)` — Fetch user identity
- `verifyEmployeeData(employmentId, expectedData)` — Verify employee data matches

#### Cleanup Behavior
- **Deleted:** Employee, User Identity, Legacy User records
- **Preserved:** Company (reused across tests)
- **Tracked:** All deleted records are logged in `test_metadata` table for audit trail

### Creating Tests with New Company

For tests that need to create a new company (e.g., "update company" tests):

```typescript
import { createTestCompanyAndData } from '../../shared/test-data';

test('update company settings', async ({ request }) => {
  const context = await useTestContext(null); // No default company
  const cleanup = await useTestCleanup(context);

  try {
    // Create new company (will be deleted on cleanup)
    const company = await createTestCompanyAndData(context, {
      name: 'Test Company',
    });

    // Create employee under new company
    const employee = await createFullEmployee(
      context,
      company.company_id,
      { firstName: 'Jane', lastName: 'Doe' }
    );

    // Test and verify...

  } finally {
    await cleanup();
  }
});
```

## Type checking

```bash
yarn tsc
```
