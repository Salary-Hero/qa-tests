# API Test Writing Guide

A practical guide for QA engineers who are new to this codebase. No prior Playwright or TypeScript experience is assumed.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Running Tests](#2-running-tests)
3. [Project Structure](#3-project-structure)
4. [Reusable Helpers Overview](#4-reusable-helpers-overview)
5. [Writing a Simple API Test](#5-writing-a-simple-api-test)
6. [Schema Validation with Zod](#6-schema-validation-with-zod)
7. [Seed & Teardown Pattern](#7-seed--teardown-pattern)
8. [Checklist Before Writing a New Test](#8-checklist-before-writing-a-new-test)

---

## 1. Prerequisites & Setup

### Install dependencies

```bash
yarn install
```

### Create your `.env` file

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Then open `.env` and fill in every value. The file should look like this:

```dotenv
# Which environment to run against: dev | staging
ENV=dev

# OTP code used in tests (check with your team lead for staging value)
OTP=111111
PINCODE=000000

# Admin credentials — one set per environment
ADMIN_EMAIL_DEV=your-admin@example.com
ADMIN_PASSWORD_DEV=your-password

ADMIN_EMAIL_STAGING=your-admin@example.com
ADMIN_PASSWORD_STAGING=your-password

# Firebase API key — one per environment
FIREBASE_API_KEY_DEV=your-key-here
FIREBASE_API_KEY_STAGING=your-key-here

# LINE credentials (only needed for LINE signup tests)
LINE_CHANNEL_ID_DEV=
LINE_CHANNEL_SECRET_DEV=
LINE_REFRESH_TOKEN_DEV=

LINE_CHANNEL_ID_STAGING=
LINE_CHANNEL_SECRET_STAGING=
LINE_REFRESH_TOKEN_STAGING=

# Database connection (needed for employee and consent tests)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

> **Never commit `.env` to git.** It is listed in `.gitignore` for this reason.

### How `ENV` works

The `ENV` variable controls which server your tests run against and which set of credentials are loaded.

| `ENV` value | API server | Credentials loaded |
|---|---|---|
| `dev` | `https://apiv2-dev.salary-hero.com` | `ADMIN_EMAIL_DEV`, `FIREBASE_API_KEY_DEV`, etc. |
| `staging` | `https://apiv2-staging.salary-hero.com` | `ADMIN_EMAIL_STAGING`, `FIREBASE_API_KEY_STAGING`, etc. |

You set `ENV` in your `.env` file, or override it per-run on the command line (see section 2).

---

## 2. Running Tests

### API tests (most common)

```bash
# Run all API tests against dev
yarn test:api

# Run all API tests against staging
yarn test:api:staging

# Override ENV inline without editing .env
ENV=staging yarn test:api
```

### View the HTML report

After a test run, open the visual report:

```bash
yarn report
```

### Type-check the code

Always run this before executing tests to catch errors early:

```bash
yarn tsc
```

If `tsc` shows errors, fix them before running tests. Do not skip this step.

---

## 3. Project Structure

```
qa-tests/
├── shared/           # Utilities shared across all test types
│   ├── utils/
│   │   ├── env.ts          # All environment variable exports — import from here
│   │   ├── schema.ts       # validateSchema() for Zod validation
│   │   ├── request.ts      # get() / post() HTTP helpers
│   │   └── seed-config.ts  # Reads company/paycycle IDs from fixtures
│   ├── endpoints.ts        # Every API URL string — add new endpoints here
│   ├── auth.ts             # loginAsAdmin() helper
│   ├── api-client.ts       # Generic HTTP client
│   ├── db.ts               # Database connection pool
│   └── db-helpers.ts       # Database query functions for test verification
│
├── api/
│   ├── helpers/
│   │   ├── admin-auth.ts         # Fetch + cache admin token
│   │   ├── identifiers.ts        # Random test data generators
│   │   ├── request.ts            # Header constants (DEFAULT_REQUEST_HEADERS, AUTH_HEADERS)
│   │   ├── seed.ts               # SeedProfile contract + seed/cleanup logic
│   │   ├── test-setup.ts         # setupSeedTeardown() — wires beforeEach/afterEach
│   │   └── profiles/             # One SeedProfile per auth method
│   ├── schema/                   # Zod response schemas
│   └── tests/                    # Test files — organised by feature
│
└── ui/                           # UI tests (separate from API tests)
```

### The `@shared/*` import alias

Instead of writing `../../../shared/utils/env`, you can write:

```typescript
import { ENV, OTP } from '@shared/utils/env'
```

The `@shared/*` alias always points to the `shared/` folder at the project root, regardless of where your test file lives.

---

## 4. Reusable Helpers Overview

### Rule: never read `process.env` directly

All environment variables are already exported from `shared/utils/env.ts`. Import them from there:

```typescript
// ✅ Correct
import { ENV, OTP, ADMIN_EMAIL } from '@shared/utils/env'

// ❌ Wrong — do not read process.env directly in tests or helpers
const otp = process.env.OTP
```

### `shared/utils/env.ts` — environment variables

Exports every variable your tests need: `ENV`, `OTP`, `PINCODE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FIREBASE_API_KEY`, and LINE credentials.

### `shared/endpoints.ts` — API URL registry

Every API endpoint string in the project lives here. Never hardcode a URL path in a test file.

```typescript
import { endpoints } from '@shared/endpoints'

// Use it like this:
await request.post(endpoints.signup.requestOtp, { ... })
await request.get(endpoints.signup.getProfile, { ... })
```

To add a new endpoint, open `shared/endpoints.ts` and add it to the appropriate group.

### `api/helpers/request.ts` — HTTP header constants

Provides two ready-to-use header objects:

```typescript
import { DEFAULT_REQUEST_HEADERS, AUTH_HEADERS } from '../../helpers/request'

// For unauthenticated requests (includes x-app-version)
headers: DEFAULT_REQUEST_HEADERS

// For authenticated requests (includes x-app-version + Bearer token)
headers: AUTH_HEADERS(myToken)
```

### `api/helpers/identifiers.ts` — random test data generators

Use these to generate unique values for each test run. This prevents collisions when tests run in parallel or repeatedly.

```typescript
import {
  generatePhone,
  generateEmployeeId,
  generateEmail,
  generateNationalId,
  generatePassportNo,
} from '../../helpers/identifiers'

const phone = generatePhone()           // e.g. "0812345678"
const employeeId = generateEmployeeId() // e.g. "EMP1714020000042"
const email = generateEmail()           // e.g. "qa-signup-1714020000042-8@qa.com"
```

### `shared/utils/schema.ts` — response validation

Validates an API response body against a Zod schema and fails the test if it does not match. See [section 6](#6-schema-validation-with-zod) for full details.

### `api/helpers/admin-auth.ts` — admin token

Fetches the admin Bearer token (cached per run). Used internally by seed helpers — you rarely need to call this directly.

---

## 5. Writing a Simple API Test

This section walks through writing a minimal API test from scratch.

### The anatomy of a test file

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature name', () => {

  test('should do something', async ({ request }) => {

    await test.step('Step description', async () => {
      // make an API call and assert the result
    })

  })

})
```

- `test.describe` groups related tests together.
- `test` is a single test case. The `request` argument is Playwright's built-in API client.
- `test.step` labels a logical part of the test — this appears in the report and helps with debugging.

### Making a POST request

```typescript
const response = await request.post(endpoints.signup.requestOtp, {
  data: { phone: '0812345678' },
  headers: DEFAULT_REQUEST_HEADERS,
})
```

- `data` is the JSON request body.
- `headers` are HTTP headers. Use `DEFAULT_REQUEST_HEADERS` for unauthenticated requests, or `AUTH_HEADERS(token)` when a Bearer token is required.

### Making a GET request

```typescript
const response = await request.get(endpoints.signup.getProfile, {
  headers: AUTH_HEADERS(idToken),
})
```

### Asserting the response

```typescript
// Check the HTTP status code
expect(response.status()).toBe(200)

// Read the JSON body
const body = await response.json()

// Assert specific fields
expect(body.is_signup).toBe(false)
expect(body.next_state).toBe('signup.phone.verify')
```

### A complete minimal example

This test calls a single endpoint and asserts the response — no database setup required.

```typescript
import { test, expect } from '@playwright/test'
import { endpoints } from '@shared/endpoints'
import { DEFAULT_REQUEST_HEADERS } from '../../helpers/request'
import { generatePhone } from '../../helpers/identifiers'

test.describe('OTP request', () => {

  test('should return 200 and a ref_code for a valid phone number', async ({ request }) => {
    const phone = generatePhone()

    await test.step('Request OTP', async () => {
      const response = await request.post(endpoints.signup.requestOtp, {
        data: { phone },
        headers: DEFAULT_REQUEST_HEADERS,
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.next_state).toBe('signup.phone.verify')
      expect(body.verification_info.ref_code).toBeTruthy()
    })
  })

})
```

---

## 6. Schema Validation with Zod

### What problem does it solve?

`expect(response.status()).toBe(200)` only checks the HTTP status. It does not verify that the response body has the correct shape — the right fields, types, and structure. Zod schemas do this.

### What is a Zod schema?

A Zod schema describes the expected shape of an object. Example:

```typescript
import { z } from 'zod'

const OtpRequestSchema = z.object({
  is_signup: z.boolean(),
  next_state: z.string(),
  verification_info: z.object({
    ref_code: z.string(),
  }),
})
```

### How to use `validateSchema`

```typescript
import { validateSchema } from '@shared/utils/schema'
import { OtpRequestSchema } from '../../schema/signup.schema'

const body = await response.json()
validateSchema(body, OtpRequestSchema, 'OTP request')
```

- The third argument is a label used in the failure message so you know which validation failed.
- If the body does not match the schema, the test fails immediately with a clear error.

### Where to put schemas

All schemas live in `api/schema/`. Each file groups schemas for one feature area:

```
api/schema/
├── signup.schema.ts           # Schemas for all signup endpoints
└── digital-consent.schema.ts  # Schemas for consent endpoints
```

Add new schemas to the relevant file, or create a new file if the feature is distinct.

### Using schema validation together with field assertions

```typescript
const body = await response.json()

// 1. Validate the overall shape first
validateSchema(body, OtpRequestSchema, 'OTP request')

// 2. Then assert specific field values
expect(body.is_signup).toBe(false)
expect(body.next_state).toBe('signup.phone.verify')
```

Do both. Schema validation catches structural problems; field assertions verify business logic.

---

## 7. Seed & Teardown Pattern

### Why tests need setup

Most API tests require an employee record to exist in the database before the test runs — for example, a signup test needs an employee with a matching phone number to sign up against. Creating this data before a test, and cleaning it up after, is called **seeding and teardown**.

### The problem with manual setup

Writing `beforeEach` and `afterEach` manually in every test file is repetitive and error-prone. This project solves that with `SeedProfile` and `setupSeedTeardown`.

### What is a `SeedProfile`?

A `SeedProfile` is a configuration object that describes everything needed to set up and tear down test data for one auth method. It defines:

- What identifiers to use (phone, employee ID, etc.)
- Which company to seed into
- How to create the employee record
- How to clean up after the test

Profiles live in `api/helpers/profiles/`. There is one profile per auth method:

| File | Auth method |
|---|---|
| `profiles/phone.ts` | Phone number signup |
| `profiles/line.ts` | LINE account signup |
| `profiles/employee-id.ts` | Employee ID signup |

### How to use `setupSeedTeardown`

```typescript
import { test } from '@playwright/test'
import { phoneSignupProfile } from '../../helpers/profiles/phone'
import { setupSeedTeardown } from '../../helpers/test-setup'

test.describe('Signup by Phone', () => {
  // 1. Create the hooks by passing in a profile
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)

  // 2. Register them with Playwright
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test('should complete signup', async ({ request }) => {
    // 3. Access the seeded data inside the test
    const ctx = getContext()
    const phone = ctx.identifiers.phone   // the phone number that was seeded
    const userId = ctx.employee.user_id   // the employee's user ID in the database

    // ... rest of the test
  })
})
```

### What `setupSeedTeardown` does for you

| Hook | What it does |
|---|---|
| `beforeEach` | Runs forced cleanup (in case of leftover state), then creates the employee record |
| `afterEach` | Deletes the employee record and clears any state created during the test |

You do not need to write any cleanup code inside the test itself.

### `SeedContext` — what `getContext()` returns

```typescript
type SeedContext = {
  company: {
    company_id: number
    paycycle_id: number
  }
  employee: {
    user_id: string       // the created employee's ID
    identifiers: { ... }
  }
  identifiers: {
    phone?: string
    employee_id?: string
    email?: string
    national_id?: string
    passport_no?: string
    line_id?: string
  }
}
```

### Serial vs parallel tests

Most profiles are parallel-safe — each test generates a unique phone number or employee ID so tests do not interfere with each other.

The LINE signup profile uses a fixed real LINE account, so those tests **must run serially**. Add this at the top of the describe block:

```typescript
test.describe.configure({ mode: 'serial' })
```

If your profile's `identifierStrategy` is `'fixed'`, you must use serial mode.

---

## 8. Checklist Before Writing a New Test

Before writing any code, go through this checklist:

- [ ] **Endpoints**: Add all new API URL paths to `shared/endpoints.ts`. Never write a URL string directly in a test file.
- [ ] **Env variables**: If a new credential is needed, add it to `.env.example` (without the value), then read it via `shared/utils/env.ts`. Never call `process.env` directly in test files.
- [ ] **Schema**: Define a Zod schema for each new response shape in `api/schema/`. Use `validateSchema()` in every test step that reads a response body.
- [ ] **Identifiers**: Use generators from `api/helpers/identifiers.ts` for any value that must be unique per run. Never hardcode test data like phone numbers or emails.
- [ ] **Seed config**: If the test needs company or paycycle IDs, look them up via `getCompany()` from `shared/utils/seed-config.ts`. The values come from `shared/fixtures/seed-config.json` — not from `.env`.
- [ ] **Type-check**: Run `yarn tsc` before running tests. Fix all errors before proceeding.
- [ ] **Run the test**: Run `yarn test:api` and confirm it passes. Check `yarn report` for details if it fails.
