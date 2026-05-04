# API Test Writing Guide

A practical reference for QA engineers working in this codebase. No prior Playwright or TypeScript experience is assumed.

---

## Table of Contents

0. [Quick Start — Write Your First Test in 15 Minutes](#0-quick-start--write-your-first-test-in-15-minutes)
1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Running Tests](#2-running-tests)
3. [Project Structure](#3-project-structure)
4. [Where Does Each Thing Go?](#4-where-does-each-thing-go)
5. [Reusable Helpers Overview](#5-reusable-helpers-overview)
6. [Writing a Test](#6-writing-a-test)
7. [Schema Validation with Zod](#7-schema-validation-with-zod)
8. [Seed & Teardown Pattern](#8-seed--teardown-pattern)
9. [Test Naming Convention](#9-test-naming-convention)
10. [Checklist Before Writing a New Test](#10-checklist-before-writing-a-new-test)

---

## 0. Quick Start — Write Your First Test in 15 Minutes

This section gets you from zero to a passing test as fast as possible. It assumes you have already completed setup (section 1).

### Step 1 — Copy the template

```bash
cp api/tests/_template.test.ts api/tests/signup/signup-my-feature.test.ts
```

The template file is at `api/tests/_template.test.ts`. It has `TODO` markers for every part you need to fill in.

### Step 2 — Fill in the test name and tags

Open your new file and update the `test.describe` label and the `test(...)` name:

```typescript
test.describe('Signup by Phone', () => {
  ...
  test(
    'API – Signup Phone – Full signup flow – Success',
    { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
```

Test name format: `[Type] – [Feature] – [Scenario] – [Expected Result]`

All four tag groups are required. See [section 9](#9-test-naming-convention) for the full tag reference.

### Step 3 — Choose your seed profile

The seed profile creates a fresh employee before each test and cleans it up after. Pick the one that matches the auth method you are testing:

```typescript
// Phone OTP signup
import { phoneSignupProfile } from '../helpers/profiles/phone'

// LINE signup
import { lineSignupProfile } from '../helpers/profiles/line'

// Employee ID signup
import { employeeIdSignupProfile } from '../helpers/profiles/employee-id'
```

Replace the profile import in your test file, then pass it to `setupSeedTeardown`:

```typescript
const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
test.beforeEach(beforeEach)
test.afterEach(afterEach)
```

### Step 4 — Access the seeded employee data

Inside your test, call `getContext()` to get the employee that was just created:

```typescript
const ctx = getContext()
const phone = ctx.identifiers.phone!   // the phone number seeded for this run
const company = ctx.company            // company ID, name, paycycle ID
```

### Step 5 — Add your test steps

Every action must be inside `test.step()`. The step name appears in the HTML report:

```typescript
await test.step('Request OTP', async () => {
  refCode = await requestPhoneOtp(request, phone)
})

await test.step('Verify OTP', async () => {
  firebaseCustomToken = await verifyPhoneOtp(request, phone, refCode)
})

await test.step('Verify result', async () => {
  const body = await getProfile(request, idToken)
  expect(body.profile.phone).toBe(phone)
  expect(body.profile.has_pincode).toBe(true)
})
```

### Step 6 — Type check and run

```bash
yarn tsc                          # must pass with zero errors before running tests
yarn test:api --grep "My Feature" # run only your new test
yarn report                       # open the HTML report to see step-by-step results
```

If `yarn tsc` fails, fix all errors before running tests. TypeScript errors always prevent a clean test run.

That is it. The complete working example is `api/tests/signup/signup-phone.test.ts` — 69 lines, open it alongside your new file as a reference.

---

## 1. Prerequisites & Setup

### Install dependencies

```bash
yarn install
```

### Create your `.env` file

Copy the example file and fill in the values:

```bash
cp .env.example .env
```

The `_DEV` and `_STAGING` suffix on each key means one file holds credentials for both environments. `yarn test:api` uses `ENV=dev` and reads the `_DEV` keys; `yarn test:api:staging` uses `ENV=staging` and reads the `_STAGING` keys.

```dotenv
# Admin credentials
ADMIN_EMAIL_DEV=your-dev-admin@example.com
ADMIN_PASSWORD_DEV=your-dev-password

ADMIN_EMAIL_STAGING=your-staging-admin@example.com
ADMIN_PASSWORD_STAGING=your-staging-password

# Firebase API keys
FIREBASE_API_KEY_DEV=your-dev-key
FIREBASE_API_KEY_STAGING=your-staging-key

# LINE credentials (only needed for LINE signup tests)
LINE_CHANNEL_ID_DEV=
LINE_CHANNEL_SECRET_DEV=
LINE_REFRESH_TOKEN_DEV=

LINE_CHANNEL_ID_STAGING=
LINE_CHANNEL_SECRET_STAGING=
LINE_REFRESH_TOKEN_STAGING=

# Database connection
# DB_HOST/DB_USER/DB_PASSWORD are shared — same RDS instance for both environments.
# DB_NAME differs per environment — dev and staging use separate databases on the same host.
DB_HOST=your-rds-host
DB_PORT=5432
DB_NAME_DEV=your-dev-db-name
DB_NAME_STAGING=your-staging-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

`OTP` and `PINCODE` are **not** in `.env` — they come from `shared/fixtures/seed-config.json` automatically (`111111` for dev, `199119` for staging).

> **Never commit `.env` to git.** It is listed in `.gitignore`.

### How `ENV` works

`ENV` controls which server the tests hit and which credentials are loaded. You never need to set it manually — the `yarn` scripts handle it.

| `ENV` | API server | Credentials |
|---|---|---|
| `dev` | `https://apiv2-dev.salary-hero.com` | `ADMIN_EMAIL_DEV`, `FIREBASE_API_KEY_DEV`, etc. |
| `staging` | `https://apiv2-staging.salary-hero.com` | `ADMIN_EMAIL_STAGING`, `FIREBASE_API_KEY_STAGING`, etc. |

---

## 2. Running Tests

```bash
# Run all API tests against dev
yarn test:api

# Run all API tests against staging
yarn test:api:staging

# Filter by tag
yarn test:api --grep @smoke
yarn test:api --grep @guardian

# Filter by test name
yarn test:api --grep "Signup Phone"

# Open the HTML report after a run
yarn report

# Type-check before running (always do this first)
yarn tsc
```

### Cleaning up leftover test data

If a test run fails mid-way and leaves orphaned records in the database:

```bash
# Preview what would be deleted (safe — asks confirmation)
yarn cleanup:dev

# Delete without prompting
yarn cleanup:dev --force

# Staging (reads _STAGING keys from .env)
yarn cleanup:staging --force
```

---

## 3. Project Structure

```
qa-tests/
│
├── shared/                      # Used by ALL test types (api, ui, etc.)
│   ├── db.ts                    # DB connection pool — internal, never import directly
│   ├── db-helpers.ts            # DB query functions: hardDeleteEmployee, getUserById, etc.
│   ├── employee-api.ts          # Employee CRUD wrappers: createEmployeeViaAPI, buildEmployeePayload, etc.
│   ├── endpoints.ts             # Every API URL — single source of truth
│   └── utils/
│       ├── env.ts               # Env var exports: ENV, ADMIN_EMAIL, FIREBASE_API_KEY, etc.
│       ├── seed-config.ts       # Per-env config: getCompany(), OTP, PINCODE, getPhonePool()
│       ├── response.ts          # parseResponse() — API call validation + error logging
│       ├── schema.ts            # validateSchema() — used in import pipeline only
│       └── error-messages.ts   # Shared error message constants
│
├── api/
│   ├── helpers/
│   │   ├── admin-console-auth.ts # getAdminToken() — cached admin Bearer token
│   │   ├── identifiers.ts       # resolvePhone(), generateEmail(), generateEmployeeId(), etc.
│   │   ├── request.ts           # Header constants: DEFAULT_REQUEST_HEADERS, AUTH_HEADERS()
│   │   ├── firebase.ts          # firebaseSignIn(), firebaseRefreshToken()
│   │   ├── line-auth.ts         # getLineAccessToken()
│   │   ├── employee.ts          # createEmployee(), findEmployeeByIdentifier() — used by seed profiles
│   │   ├── pin-api.ts            # createPin()
│   │   ├── profile-api.ts       # getProfile()
│   │   ├── auth-api.ts          # logout()
│   │   ├── phone-signup-api.ts  # requestPhoneOtp(), verifyPhoneOtp()
│   │   ├── line-signup-api.ts   # submitLineToken(), requestLineOtp(), verifyLineOtp()
│   │   ├── employee-id-signup-api.ts  # lookupEmployee(), requestEmployeeIdOtp(), verifyEmployeeIdOtp()
│   │   ├── digital-consent-signup-api.ts  # validateScreeningIdentity(), submitConsentRequestForm(), verifyConsentOtp()
│   │   ├── digital-consent-import.ts  # importDigitalConsentData() — 7-step admin import pipeline
│   │   ├── seed.ts              # SeedProfile / SeedContext types + seed/cleanup execution
│   │   ├── test-setup.ts        # setupSeedTeardown() — wires beforeEach/afterEach from a profile
│   │   └── profiles/            # One SeedProfile per auth method
│   │       ├── phone.ts         # Phone number signup
│   │       ├── line.ts          # LINE account signup
│   │       ├── employee-id.ts   # Employee ID + national ID / passport signup
│   │       └── entra-id.ts      # Microsoft Entra ID signup (not yet implemented)
│   ├── schema/
│   │   ├── signup.schema.ts     # Zod schemas for all signup API responses
│   │   └── digital-consent.schema.ts  # Zod schemas for consent API responses
│   ├── fixtures/
│   │   └── digital-consent-import.xlsx  # Excel fixture for consent import tests
│   └── tests/
│       ├── signup/
│       │   ├── signup-phone.test.ts
│       │   ├── signup-line.test.ts
│       │   └── signup-employee-id.test.ts
│       ├── employees/
│       │   └── employee.test.ts
│       └── digital-consent/
│           └── digital-consent.test.ts
│
├── scripts/
│   └── cleanup-test-data.ts     # Manual cleanup script for leftover DB records
│
├── shared/fixtures/
│   └── seed-config.json         # QA company IDs, OTP codes, phone pools per environment
│
└── docs/
    └── API_TESTING_GUIDE.md     # This file
```

---

## 4. Where Does Each Thing Go?

Use this decision tree whenever you are about to create something new.

```
What are you creating?
│
├── A DB query (SELECT / DELETE / INSERT)?
│     → shared/db-helpers.ts
│
├── Config, env var, or company ID?
│     → shared/utils/env.ts         (credentials, API keys)
│     → shared/utils/seed-config.ts (company IDs, OTP, phone pool)
│
├── An API endpoint URL string?
│     → shared/endpoints.ts
│
├── Test data setup or cleanup logic?
│     → api/helpers/profiles/{auth-method}.ts   (per-auth-method seed profile)
│     → api/helpers/seed.ts                     (type definitions + shared logic)
│
├── A Zod schema for an API response?
│     → api/schema/{feature}.schema.ts
│
├── A random test data value (phone, email, employee ID)?
│     → api/helpers/identifiers.ts only
│
├── A reusable API call used across 2+ test files?
│     → api/helpers/{feature}-signup-api.ts   (e.g. phone-signup-api.ts, line-signup-api.ts)
│
└── An API call used in only one test file?
      → inline in the test file
```

### File responsibilities at a glance

| File | Single responsibility |
|---|---|
| `shared/db-helpers.ts` | All raw SQL — the only file allowed to import `query()` |
| `shared/employee-api.ts` | Employee CRUD API wrappers — usable by both API and UI tests |
| `shared/endpoints.ts` | All URL strings — never hardcode a path in a test or helper |
| `shared/utils/env.ts` | Credentials and env vars — never read `process.env` anywhere else |
| `shared/utils/seed-config.ts` | Per-environment config: company IDs, OTP, PINCODE, phone pool |
| `shared/utils/response.ts` | `parseResponse()` — the one function to validate every API response |
| `api/helpers/identifiers.ts` | Random identifier generators — the only place these should live |
| `api/helpers/request.ts` | HTTP header constants: `DEFAULT_REQUEST_HEADERS`, `AUTH_HEADERS()` |
| `api/helpers/admin-console-auth.ts` | `getAdminToken()` — cached admin token, call this everywhere |
| `api/helpers/pin-api.ts` | `createPin()` |
| `api/helpers/profile-api.ts` | `getProfile()` |
| `api/helpers/auth-api.ts` | `logout()` |
| `api/helpers/phone-signup-api.ts` | Phone signup API calls |
| `api/helpers/line-signup-api.ts` | LINE signup API calls |
| `api/helpers/employee-id-signup-api.ts` | Employee ID signup API calls |
| `api/helpers/digital-consent-signup-api.ts` | Digital Consent signup API calls |
| `api/helpers/profiles/` | Seed profiles — one file per auth method |
| `api/schema/` | Zod response schemas — one file per feature |

---

## 5. Reusable Helpers Overview

### OTP and PINCODE — from config, not `.env`

`OTP` and `PINCODE` are read from `seed-config.json` per environment — never from `.env`:

```typescript
import { OTP, PINCODE } from '@shared/utils/seed-config'
// dev: OTP = '111111', staging: OTP = '199119'
```

Using the wrong OTP on staging sends a real SMS to a real person.

### `shared/utils/response.ts` — validate every API response

`parseResponse()` is the standard way to call an API and validate the result. It replaces the old `expect(status).toBe(200)` + manual body parse pattern.

```typescript
import { parseResponse } from '@shared/utils/response'
import { OtpRequestSchema } from '../../schema/signup.schema'

const payload = { phone }
const response = await request.post(endpoints.signup.requestOtp, {
  data: payload,
  headers: DEFAULT_REQUEST_HEADERS,
})
const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)
// parsed is fully typed — access fields directly
refCode = parsed.verification_info.ref_code
```

When a test fails, `parseResponse` logs the full context automatically:

```
[parseResponse] Request OTP — unexpected status
  Expected: 200
  Received: 422
  URL:      POST https://apiv2-dev.salary-hero.com/api/v2/public/account/signup/phone
  Payload:  {"phone":"0812345678"}
  Body:     {"error":"phone_already_registered"}
```

### `shared/endpoints.ts` — all URL strings

Never write a URL path in a test or helper file:

```typescript
import { endpoints } from '@shared/endpoints'

await request.post(endpoints.signup.requestOtp, { ... })
await request.get(endpoints.signup.getProfile, { ... })
```

To add a new endpoint, open `shared/endpoints.ts` and add it to the relevant group.

### `api/helpers/identifiers.ts` — test data generators

Always use `resolvePhone()` (not `generatePhone()` directly) — on staging it automatically picks from the approved phone pool:

```typescript
import { resolvePhone, generateEmail, generateEmployeeId } from '../../helpers/identifiers'

const phone = resolvePhone()           // safe on both dev and staging
const email = generateEmail()          // qa-signup-{ts}-{rand}@qa.com
const employeeId = generateEmployeeId() // EMPAPI{ts}{rand}
```

`EMPAPI` prefix on employee IDs makes leftover test data easy to identify and clean up.

### `api/helpers/request.ts` — HTTP headers

```typescript
import { DEFAULT_REQUEST_HEADERS, AUTH_HEADERS } from '../../helpers/request'

// Unauthenticated (no Bearer token)
headers: DEFAULT_REQUEST_HEADERS

// Authenticated (with Bearer token)
headers: AUTH_HEADERS(idToken)
```

### Feature API helpers — one file per responsibility

Each API feature has its own focused helper file:

```typescript
import { createPin } from '../../helpers/pin-api'
import { getProfile } from '../../helpers/profile-api'
import { logout } from '../../helpers/auth-api'

await test.step('Create PIN', async () => {
  await createPin(request, idTokenPrePin)  // POST /v1/user/account/profile/pincode/create
})

await test.step('Get Profile', async () => {
  const body = await getProfile(request, idTokenPostPin)  // GET /v1/user/account/profile
  expect(body.profile.phone).toBe(phone)
})
```

### `api/helpers/admin-console-auth.ts` — admin token

```typescript
import { getAdminToken } from '../../helpers/admin-console-auth'

const token = await getAdminToken(request)  // cached — safe to call multiple times
```

---

## 6. Writing a Test

### Test file anatomy

```typescript
import { test, expect } from '@playwright/test'

test.describe('Feature Name', () => {

  test(
    'API – Feature – Scenario – Expected Result',
    { tag: ['@component', '@high', '@regression', '@shared'] },
    async ({ request }) => {

      await test.step('Step description', async () => {
        // make an API call and assert the result
      })

    }
  )

})
```

Every logical action must be wrapped in `test.step()`. The step label appears in the HTML report and makes failures easier to diagnose.

### A complete minimal example

```typescript
import { test, expect } from '@playwright/test'
import { endpoints } from '@shared/endpoints'
import { parseResponse } from '@shared/utils/response'
import { OtpRequestSchema } from '../../schema/signup.schema'
import { DEFAULT_REQUEST_HEADERS } from '../../helpers/request'
import { resolvePhone } from '../../helpers/identifiers'

test.describe('Signup by Phone', () => {

  test(
    'API – Signup Phone – Request OTP – Success',
    { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
    async ({ request }) => {
      const phone = resolvePhone()

      await test.step('Request OTP', async () => {
        const payload = { phone }
        const response = await request.post(endpoints.signup.requestOtp, {
          data: payload,
          headers: DEFAULT_REQUEST_HEADERS,
        })
        const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)
        expect(parsed.is_signup).toBe(false)
        expect(parsed.next_state).toBe('signup.phone.verify')
      })
    }
  )

})
```

### Adding lifecycle hooks (setup and teardown)

For tests that need an employee record seeded before they run, use `setupSeedTeardown`:

```typescript
import { setupSeedTeardown } from '../../helpers/test-setup'
import { phoneSignupProfile } from '../../helpers/profiles/phone'

test.describe('Signup by Phone', () => {
  const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
  test.beforeEach(beforeEach)
  test.afterEach(afterEach)

  test('API – Signup Phone – Full signup flow – Success', ..., async ({ request }) => {
    const ctx = getContext()
    const phone = ctx.identifiers.phone!  // the seeded phone number
  })
})
```

`afterEach` automatically calls `hardDeleteEmployee()` — a full hard delete that removes the employee and all related records so the phone number and bank account can be reused in the next run.

---

## 7. Schema Validation with Zod

### What problem does it solve?

A 200 status code only means the server responded. It does not verify the response body has the right shape. Zod schemas catch:
- Missing fields
- Wrong field types (`string` returned where `number` expected)
- API contract changes

### Defining a schema

```typescript
import { z } from 'zod'

export const OtpRequestSchema = z.object({
  is_signup: z.boolean(),
  next_state: z.string(),
  verification_info: z.object({
    ref_code: z.string(),
  }),
})
```

Schemas live in `api/schema/{feature}.schema.ts`. Add new schemas to the relevant file, or create a new file for a new feature area.

### Validating a response with `parseResponse()`

```typescript
const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)
// parsed is typed as z.infer<typeof OtpRequestSchema>
```

`parseResponse` handles all three failure modes:
1. Wrong HTTP status → logs status + URL + payload + body, then throws
2. Non-JSON response → logs URL + payload + raw text, then throws
3. Schema mismatch → logs body + Zod validation errors, then throws

### Optional fields in shared schemas

The `GetProfileSchema` is shared across all signup flows. Feature-specific optional fields use `.optional()`:

```typescript
export const GetProfileSchema = z.object({
  profile: z.object({
    phone: z.string().optional(),
    line_id: z.string().nullable().optional(),
    employee_id: z.string().optional(),
    has_pincode: z.boolean(),
    signup_at: z.string().nullable(),
  }),
  // Present only for digital consent users — use this instead of is_consent_accepted (deprecated)
  employee_profile: z.object({
    consent_status: z.string().optional(),
  }).optional(),
})
```

Every field you `expect()` in a test must be declared in the schema.

---

## 8. Seed & Teardown Pattern

### Why tests need setup

Signup tests require an employee record to exist before the test runs — the employee's phone number or employee ID must match what the test sends to the API. Creating and cleaning up this data is handled by the seed profile system.

### How it works

```typescript
import { setupSeedTeardown } from '../../helpers/test-setup'
import { phoneSignupProfile } from '../../helpers/profiles/phone'

const { beforeEach, afterEach, getContext } = setupSeedTeardown(phoneSignupProfile)
test.beforeEach(beforeEach)
test.afterEach(afterEach)
```

| Hook | What it does |
|---|---|
| `beforeEach` | Cleans up any leftover state from failed runs, then creates a fresh employee record |
| `afterEach` | Calls `hardDeleteEmployee()` — removes the user and all related DB rows |

### Accessing seeded data in the test

```typescript
const ctx = getContext()
const phone = ctx.identifiers.phone!      // the seeded phone number
const employeeId = ctx.identifiers.employee_id   // the seeded employee_id
const company = ctx.company               // { id, name, qa_paycycle_id }
```

### Available profiles

| File | Auth method | Parallelism |
|---|---|---|
| `profiles/phone.ts` | Phone number + OTP | Parallel-safe |
| `profiles/line.ts` | LINE account | Must be serial (fixed LINE account) |
| `profiles/employee-id.ts` | Employee ID + national ID or passport | Parallel-safe |

### Staging phone numbers

On staging, real OTPs are sent to real phones. Only numbers `0881001500`–`0881001600` are approved for testing. `resolvePhone()` handles this automatically — it picks from the approved pool on staging and generates a random number on dev.

### Why `hardDeleteEmployee` instead of the API delete

The admin API `DELETE /v1/admin/account/employee/:userId` is a soft delete — it sets `deleted_at` but leaves the records in place. Soft-deleted phone numbers and bank account numbers still block reuse within the same paycycle.

`hardDeleteEmployee()` in `shared/db-helpers.ts` performs a full FK-safe delete in the correct order:

```
employee_profile_audit → employee_profile → employment
→ user_identity → user_balance → user_bank → user_provider → users
```

---

## 9. Test Naming Convention

Every test must follow this format:

```
[Type] – [Feature] – [Scenario] – [Expected Result]
```

**Examples:**

```
API – Signup Phone – Full signup flow – Success
API – Employee – Create employee – Success
API – Digital Consent – Import employee records – consent_status = new
API – Signup Employee ID – Full signup flow with passport number – Success
```

### Mandatory tags

Every test must include 4 tags:

```typescript
test(
  'API – Signup Phone – Full signup flow – Success',
  { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
  async ({ request }) => { ... }
)
```

| Tag | Values | Meaning |
|---|---|---|
| Type | `@component` / `@workflow` | Component = single API/feature. Workflow = cross-feature flow. |
| Priority | `@high` / `@medium` / `@low` | How critical is this test |
| Execution | `@smoke` / `@regression` | Smoke = fast CI gate. Regression = full suite. |
| Squad | `@guardian` / `@avengers` / `@shared` | Who owns this test |

### Squad ownership

| Squad | Covers |
|---|---|
| `@guardian` | Authentication (all signup flows) + Digital Consent |
| `@avengers` | Withdrawal / EWA features |
| `@shared` | Shared features: employees, companies, etc. |

### Running by tag

```bash
yarn test:api --grep @smoke       # smoke tests only
yarn test:api --grep @guardian    # guardian squad tests
yarn test:api --grep @regression  # full regression suite
```

---

## 10. Checklist Before Writing a New Test

Before writing any code, go through this checklist:

- [ ] **Endpoint** — Add the URL to `shared/endpoints.ts`. Never hardcode a path in a test or helper.
- [ ] **Schema** — Define a Zod schema for each new response shape in `api/schema/{feature}.schema.ts`. Every field you assert must be declared in the schema.
- [ ] **Identifier** — Use `resolvePhone()`, `generateEmail()`, or `generateEmployeeId()` from `api/helpers/identifiers.ts`. Never hardcode test data.
- [ ] **Config** — If the test needs a company ID or paycycle ID, use `getCompany('name')` from `shared/utils/seed-config.ts`. Never hardcode numeric IDs.
- [ ] **Env vars** — If a new credential is needed, add it to `.env.example`, then export it from `shared/utils/env.ts`. Never read `process.env` directly.
- [ ] **Helper placement** — If the same API call appears in 2+ test files, extract it to `api/helpers/{feature}-flow.ts`. See [section 4](#4-where-does-each-thing-go) for the full decision tree.
- [ ] **Test name** — Follow the `[Type] – [Feature] – [Scenario] – [Expected Result]` convention with all 4 mandatory tags.
- [ ] **Type-check** — Run `yarn tsc` before running tests. Fix all errors before proceeding.
- [ ] **Run the test** — Run `yarn test:api` and confirm it passes. Check `yarn report` for details if it fails.
- [ ] **Cleanup** — If the test leaves data behind after a failed run, `yarn cleanup:dev --force` removes it.
