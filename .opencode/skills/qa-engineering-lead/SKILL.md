---
name: qa-engineering-lead
description: QA coding standards, project-specific rules, and anti-patterns for this repo. Load when writing or reviewing test code.
---

# QA Engineering Lead — Standards Reference

## 1. Security

- Never hardcode credentials, API keys, or tokens in any file
- Credentials are typed as `string | undefined` — callers must guard explicitly and throw a named error if missing
- `.env` must be in `.gitignore`; `.env.example` must document every variable with no real values
- Test data uses only test company IDs from `seed-config.json`, never production data
- Error messages must not expose credential values

## 2. Configuration — Single Source of Truth

- **Env file**: Single `.env` file only. Never create `.env.dev`, `.env.staging`, or any other split files. The `_DEV` / `_STAGING` suffix on each key already handles the environment distinction — one file is sufficient.
- **Environment vars**: `shared/utils/env.ts` only. Never read `process.env` directly in test files or helpers.
- **Company IDs**: `getCompany('name')` from `shared/utils/seed-config.ts` only. Never hardcode numeric IDs.
- **OTP code**: `OTP` from `shared/utils/seed-config.ts` only — reads `seed-config.json` per environment (`111111` for dev, `199119` for staging). Never import `OTP` from `env.ts` or hardcode any OTP value. Wrong OTP on staging sends a real SMS.
- **PINCODE**: `PINCODE` from `shared/utils/seed-config.ts` only — same pattern as OTP.
- **Base URLs**: `playwright.config.ts` only. No duplicate URL maps in helpers. Exception: `getApiBaseUrl()` in `shared/utils/env.ts` is used exclusively for native `fetch` calls that cannot use Playwright's `request` context (e.g. multipart file upload in `digital-consent-import.ts`).
- **DB name**: `DB_NAME_DEV` / `DB_NAME_STAGING` — same RDS host, different database per environment. `shared/db.ts` reads the correct key based on `ENV`. Never use a plain `DB_NAME` key.
- **Admin auth**: `getAdminToken()` from `api/helpers/admin-auth.ts` only (cached).

## 3. DB Query Placement

- Raw SQL (`query(...)`) is permitted **only** in `shared/db-helpers.ts`.
- Test files (`.test.ts`) must **never** import `query` or `getClient` directly.
- Cleanup functions that touch the DB must live in `shared/db-helpers.ts`, not inline in test files.

## 4. TypeScript

- No `any` types in test files — use the correct interface (`EmployeeResponse`, etc.).
- No `as any` casts — fix the underlying type. Use `Partial<T>` for PATCH payloads, `EmployeePatchPayload` for employee updates.
- Run `yarn tsc` after every change. Fix all errors before running tests.
- Add dependencies to `package.json` before importing them.

## 5. Test File Standards

- File extension: `.test.ts` only. Never `.spec.ts`.
- Every logical action inside `test()`, `beforeAll()`, `beforeEach()`, `afterAll()`, `afterEach()` must be wrapped in `test.step()`.
- No dead imports. No unused exports.
- No semicolons — the rest of the codebase is semicolon-free.

### Test naming convention

Every test must follow: `[Type] – [Feature] – [Scenario] – [Expected Result]`

```typescript
test(
  'API – Signup Phone – Full signup flow – Success',
  { tag: ['@component', '@high', '@smoke', '@regression', '@guardian'] },
  async ({ request }) => { ... }
)
```

**Mandatory tags — all four are required on every test:**

| Tag | Values |
|---|---|
| Type | `@component` (single endpoint/feature) or `@workflow` (cross-feature flow) |
| Priority | `@high` / `@medium` / `@low` |
| Execution | `@smoke` (fast CI gate) and/or `@regression` (full suite) |
| Squad | `@guardian` / `@avengers` / `@shared` |

**Squad ownership:**

| Squad | Covers |
|---|---|
| `@guardian` | All signup flows + Digital Consent |
| `@avengers` | Withdrawal / EWA features |
| `@shared` | Employees, companies, and other shared features |

## 6. Where Each Thing Goes

Use this decision tree before creating anything new:

```
DB query (SELECT / DELETE / INSERT)?
  → shared/db-helpers.ts

Config, env var, or company ID?
  → shared/utils/env.ts          (credentials, API keys, APP_VERSION)
  → shared/utils/seed-config.ts  (company IDs, OTP, PINCODE, phone pool)

API endpoint URL string?
  → shared/endpoints.ts

Test data setup or cleanup?
  → api/helpers/profiles/{auth-method}.ts  (per-auth seed profile)
  → api/helpers/seed.ts                    (type definitions + shared logic)

Zod schema for an API response?
  → api/schema/{feature}.schema.ts

Random test data (phone, email, employee ID)?
  → api/helpers/identifiers.ts only

Reusable API call used in 2+ test files?
  → api/helpers/{feature}-flow.ts  (e.g. signup-flow.ts, consent-flow.ts)

API call specific to one test file only?
  → inline in the test file
```

**File responsibilities at a glance:**

| File | Single responsibility |
|---|---|
| `shared/db-helpers.ts` | All raw SQL — only file allowed to import `query()` |
| `shared/employee-api.ts` | Employee CRUD API wrappers — used by both API and UI tests |
| `shared/endpoints.ts` | All URL strings — never hardcode a path anywhere else |
| `shared/utils/env.ts` | Credentials and env vars — never read `process.env` elsewhere |
| `shared/utils/seed-config.ts` | Per-env config: company IDs, OTP, PINCODE, phone pool |
| `shared/utils/response.ts` | `parseResponse()` — the only way to validate API responses |
| `api/helpers/identifiers.ts` | Random identifier generators — the only place they live |
| `api/helpers/request.ts` | HTTP header constants: `DEFAULT_REQUEST_HEADERS`, `AUTH_HEADERS()` |
| `api/helpers/admin-auth.ts` | `getAdminToken()` — cached admin token |
| `api/helpers/signup-flow.ts` | `createPin()`, `getProfile()`, `logout()` — shared by all signup tests |
| `api/helpers/consent-flow.ts` | `validateScreeningIdentity()`, `submitConsentRequestForm()`, `verifyConsentOtp()` |
| `api/helpers/profiles/` | Seed profiles — one file per auth method |
| `api/schema/` | Zod response schemas — one file per feature area |

## 7. Identifier Generation

- All random identifiers come from `api/helpers/identifiers.ts` only. Never add generators elsewhere.
- **Never call `generatePhone()` directly.** Always use `resolvePhone()` — it picks from the staging phone pool automatically.
- `generatePhone()` is a private primitive called only by `resolvePhone()`.
- Employee IDs use the `EMPAPI` prefix: `EMPAPI{timestamp}{rand}`. The cleanup script (`scripts/cleanup-test-data.ts`) depends on this prefix — changing it will break cleanup.
- Digital consent fixture employee IDs use `EMPAPI-CONSENT-{N}` format (e.g. `EMPAPI-CONSENT-001`).

## 8. Response Validation

- **Always use `parseResponse()` from `shared/utils/response.ts`** — never use `expect(response.status()).toBe(200)` + manual `response.json()` + `as SomeType` cast.
- `parseResponse()` handles status check, JSON parse, Zod validation, and full error logging in one call.
- Pass the request `payload` as the fifth argument so it appears in failure logs.
- Firebase helpers (`firebaseSignIn()`, `firebaseRefreshToken()`) already validate internally — use their return values directly without re-wrapping in `Schema.parse()`.

```typescript
// ✅ Correct
const payload = { phone }
const response = await request.post(endpoints.signup.requestOtp, { data: payload, headers: DEFAULT_REQUEST_HEADERS })
const parsed = await parseResponse(response, OtpRequestSchema, 'Request OTP', 200, payload)

// ❌ Wrong
const response = await request.post(...)
expect(response.status()).toBe(200)
const body = await response.json() as OtpResponse
```

### Schema completeness

- Every field asserted in a test must be declared in the corresponding Zod schema.
- Feature-specific optional fields (e.g. `line_id`, `employee_profile.consent_status`) must be declared as `.optional()` in shared schemas like `GetProfileSchema`.
- `is_consent_accepted` is **deprecated** — do not use or assert it. Use `employee_profile.consent_status` instead.
- `z.object({}).passthrough()` is a temporary placeholder only — must include a `// TODO:` comment explaining what fields to add.

## 9. HTTP Layer

- All HTTP requests use the Playwright `request` context (or helpers that wrap it).
- Use relative URL paths — `playwright.config.ts` sets `baseURL`, so Playwright resolves the full URL automatically.
- Never construct absolute URLs in test files or helpers, except in `getApiBaseUrl()` for native `fetch` (multipart upload only).
- Shared API call sequences that appear in multiple test files must be extracted to `api/helpers/{feature}-flow.ts`. Do not inline them.

## 10. Cleanup Strategy

- All test cleanup must use `hardDeleteEmployee(userId)` from `shared/db-helpers.ts`.
- The admin API soft delete sets `deleted_at` but leaves records in place — soft-deleted phone numbers and bank account numbers are still subject to the paycycle uniqueness constraint.
- `hardDeleteEmployee` runs inside a transaction and deletes in FK-safe order:

```
employee_profile_audit → employee_profile → employment
→ user_identity → user_balance → user_bank → user_provider → users
```

- `user_provider` has **no FK constraint to `users`** — it is not cascaded automatically. `hardDeleteEmployee()` deletes it explicitly. Never assume it is handled by cascade.
- The only exception: the DELETE CRUD test case itself must use `deleteEmployeeViaAPI` to test the API endpoint, followed immediately by `hardDeleteEmployee` to clear paycycle constraints.
- `deleteEmployee()` in `api/helpers/employee.ts` and `deleteEmployeeViaAPI()` in `shared/employee-api.ts` are kept solely for testing the soft-delete API behaviour. Never use them for routine cleanup.
- `deleteEmployeeProfileRecords()` in `shared/db-helpers.ts` is for digital consent import cleanup only.

### Cleanup pattern for multi-user tests

Use the array pattern — push user IDs as they are created, drain in `afterEach`:

```typescript
const userIdsToClean: number[] = []

test.afterEach(async () => {
  await test.step('Cleanup — hard delete employee', async () => {
    while (userIdsToClean.length > 0) {
      const userId = userIdsToClean.pop()!
      await hardDeleteEmployee(String(userId))
    }
  })
})
```

Push IDs immediately after creation — never rely on `try/finally` blocks inside test bodies.

### Leftover data cleanup script

```bash
yarn cleanup:dev --force      # remove all EMPAPI* and qa-signup-* employees from dev DB
yarn cleanup:staging --force  # same for staging
```

The script also removes orphaned `user_provider` rows filtered by QA company ID prefix in `ref_id`.

## 11. Code Comments

- Comments explain "why", not "what".
- No section divider boxes. No narration comments. No test count annotations in describe labels.
- File-level JSDoc max ~15 lines.

## 12. Code Writing Standards — Prevention Habits

These five habits prevent the majority of bugs in this codebase. Apply them before writing any function.

### Habit 1: Trace every type transformation end-to-end

Before converting a value, write out the type at each step. Ask: can any step produce `NaN`, `undefined`, `""`, or silently drop formatting (e.g. leading zeros)?

- Always pass a radix: `parseInt(value, 10)`
- Always guard after conversion: `if (isNaN(result) || result <= 0) throw new Error(...)`
- Phone numbers and IDs with leading zeros must use `.padStart(original.length, '0')` if numeric arithmetic is involved

### Habit 2: Never cast with `as T` — parse instead

- If you control the type: use the typed variable directly
- If you don't (API response, `response.json()`, env var): use `parseResponse()` or `ZodSchema.parse()`
- Never write `body.field as string` — use Zod and access the typed result

### Habit 3: Validate at the boundary — fail loudly at startup

- Every value crossing a trust boundary (env vars, config files, API responses) must be validated immediately
- Credentials must be checked for presence before use — never default to `''`
- Required config must throw if absent, not return `undefined` silently

### Habit 4: Name every magic value

- Numeric IDs must come from `getCompany()` or `seed-config.json` — never inline
- Wait durations must have a comment explaining why the wait exists
- Never use `0`, `''`, or `'TBD'` as sentinels — use `undefined` or `null`

### Habit 5: Make the impossible unrepresentable

- Use `string | undefined` for optional credentials
- Use `undefined` for uninitialised state, not a secretly-unset typed variable
- Throw early if a function's preconditions are not met

## 13. Staging Phone Numbers — Critical Rule

The staging environment sends **real OTP messages** to real phone numbers.

- **Approved range**: `0881001500` – `0881001600` (101 numbers)
- **OTP bypass code**: `199119` (from `seed-config.json`, not `.env`)
- **ref_code**: `salary-hero-bypass` (returned automatically by the API for pool numbers)
- **Never call `generatePhone()` on staging** — use `resolvePhone()` which handles this automatically
- The phone pool is in `shared/fixtures/seed-config.json` under `staging.phonePool`

## 14. Anti-Patterns (Do Not Replicate)

| Anti-pattern | Correct alternative |
|---|---|
| Creating `.env.dev` or `.env.staging` | Single `.env` with `_DEV`/`_STAGING` suffixed keys |
| Reading `process.env` in test/helper files | Import from `shared/utils/env.ts` |
| `expect(response.status()).toBe(200)` + manual body parse | `parseResponse()` from `shared/utils/response.ts` |
| `FirebaseSignInSchema.parse(await firebaseSignIn(...))` | Use return value directly — helpers validate internally |
| Inlining steps already in `signup-flow.ts` or `consent-flow.ts` | Import and call the existing helper |
| `shared/env-config.ts` | Deleted — use `shared/utils/env.ts` |
| `shared/auth.ts` / `loginAsAdmin()` | Deleted — use `api/helpers/admin-auth.ts` / `getAdminToken()` |
| `shared/api-client.ts` | Deleted — use relative paths + Playwright `request` context |
| `shared/utils/request.ts` | Deleted — use Playwright `request` context directly |
| `let x: any` in test files | Typed response interface |
| Hardcoded numeric company IDs (`514`, `128`, `1287`, etc.) | `getCompany('name').id` |
| Hardcoded OTP `'111111'` or `'199119'` | `OTP` from `shared/utils/seed-config.ts` |
| `import { OTP } from 'shared/utils/env'` | `import { OTP } from 'shared/utils/seed-config'` |
| `generatePhone()` in test or seed code | `resolvePhone()` from `api/helpers/identifiers.ts` |
| `employee_id LIKE 'EMP%'` in custom SQL | `LIKE 'EMPAPI%'` — current prefix |
| `try/finally` cleanup inside test body | `afterEach` with `userIdsToClean` array |
| `query()` inside `.test.ts` | Named function in `shared/db-helpers.ts` |
| Semicolons in test files | No semicolons — match the rest of the codebase |

---

**Last updated**: April 2026
