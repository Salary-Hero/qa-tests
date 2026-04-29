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
- **Admin auth**: `getAdminToken()` from `api/helpers/admin-console-auth.ts` only (cached).

## 3. DB Query Placement

- Raw SQL (`query(...)`) is permitted **only** in `shared/db-helpers.ts`.
- Test files (`.test.ts`) must **never** import `query` or `getClient` directly.
- Cleanup functions that touch the DB must live in `shared/db-helpers.ts`, not inline in test files. This includes any wrapper function that calls `hardDeleteEmployee()`, `findSignedUpUserIds()`, or any other DB helper — even if it does not call `query()` directly. If its purpose is cleanup and it touches the DB, it belongs in `shared/db-helpers.ts` as a named export.

  **Wrong — inline cleanup defined in `.test.ts`:**
  ```typescript
  async function cleanupSignedUpUsers() {
    const userIds = await findSignedUpUserIds(NATIONAL_IDS, PASSPORT_NOS)
    for (const userId of userIds) {
      await hardDeleteEmployee(userId)
    }
  }
  ```

  **Correct — named export in `shared/db-helpers.ts`, imported by the test:**
  ```typescript
  // shared/db-helpers.ts
  export async function cleanupConsentSignedUpUsers(
    nationalIds: string[],
    passportNos: string[]
  ): Promise<void> {
    const userIds = await findSignedUpUserIds(nationalIds, passportNos)
    for (const userId of userIds) {
      await hardDeleteEmployee(userId)
    }
  }
  ```

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
| `api/helpers/firebase.ts` | `firebaseSignIn()`, `firebaseRefreshToken()` |
| `api/helpers/admin-console-auth.ts` | `getAdminToken()` — cached admin token |
| `api/helpers/pin-api.ts` | `createPin()` — POST /pincode/create |
| `api/helpers/profile-api.ts` | `getProfile()` — GET /profile |
| `api/helpers/auth-api.ts` | `logout()` — POST /logout |
| `api/helpers/phone-signup-api.ts` | `requestPhoneOtp()`, `verifyPhoneOtp()` |
| `api/helpers/line-signup-api.ts` | `submitLineToken()`, `requestLineOtp()`, `verifyLineOtp()` |
| `api/helpers/employee-id-signup-api.ts` | `lookupEmployee()`, `requestEmployeeIdOtp()`, `verifyEmployeeIdOtp()` |
| `api/helpers/digital-consent-signup-api.ts` | `validateScreeningIdentity()`, `submitConsentRequestForm()`, `verifyConsentOtp()` |
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
- No section divider boxes of any form — no `// ---`, no `// ===`, no `// *** Name ***`, no `// ───`. Use whitespace, `describe` blocks, or function names to separate logical groups instead.
- No narration comments. No test count annotations in describe labels.
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
| DB-touching cleanup function defined inline in `.test.ts` | Named export in `shared/db-helpers.ts` — even wrappers around `hardDeleteEmployee()` |
| `// ---` or `// ===` section divider comments | Whitespace or `describe` blocks to separate logical groups |
| Semicolons in test files | No semicolons — match the rest of the codebase |

## 15. UI Tests — Out of Scope for This Skill

This skill covers **API tests only** (`api/tests/`). The repo also contains UI tests under `ui/admin/` and `ui/hr/`, which use Playwright in browser mode with Page Object Models.

Do not apply API test patterns to UI tests:
- UI tests do not use `parseResponse()`, `hardDeleteEmployee()`, or `SeedProfile`
- UI tests do not live under `api/` — never create UI test files there
- If asked to write a UI test, state that this skill does not cover UI testing and ask the user for UI-specific standards before proceeding

## 16. New Test Checklist

Run through this checklist before writing any new test file. Each item maps to a rule in the sections above.

```
[ ] Endpoint URL added to shared/endpoints.ts (§6)
[ ] Zod schema created in api/schema/{feature}.schema.ts (§8)
[ ] Company ID resolved via getCompany('name') in seed-config.ts — no hardcoded numbers (§2)
[ ] Env vars accessed through shared/utils/env.ts — no process.env in test code (§2)
[ ] Identifiers generated from api/helpers/identifiers.ts using resolvePhone() (§7)
[ ] Seed profile created in api/helpers/profiles/{auth-method}.ts if new auth method (§6)
[ ] DB cleanup function added to shared/db-helpers.ts if DB teardown is needed (§3)
[ ] Test file named {feature}.test.ts — never .spec.ts (§5)
[ ] Every action in test()/beforeAll()/afterEach() etc. wrapped in test.step() (§5)
[ ] Test name follows: [Type] – [Feature] – [Scenario] – [Expected Result] (§5)
[ ] All four mandatory tags present: @component/@workflow, @high/@medium/@low, @smoke/@regression, @guardian/@avengers/@shared (§5)
[ ] No any types, no as any casts (§4)
[ ] yarn tsc passes with zero errors (§4)
[ ] COVERAGE_MATRIX.md updated with new test IDs (§6 reference doc)
```

When using the `/new-test` command this checklist is applied automatically. When scaffolding manually, work through it top to bottom.

## 17. Database Safety Guardrails

These rules exist to prevent accidental data loss or schema corruption in any environment. They apply to every SQL statement written in this repo — whether in `shared/db-helpers.ts`, the cleanup script, or anywhere else.

### Forbidden SQL — never write these under any circumstances

| Statement | Why |
|---|---|
| `DROP TABLE` / `DROP DATABASE` | Irreversible — destroys data for all environments sharing the DB |
| `TRUNCATE` | Removes all rows with no WHERE scope — equivalent to an unscoped DELETE |
| `DELETE` without a `WHERE` clause | Same as TRUNCATE — touches every row in the table |
| `UPDATE` without a `WHERE` clause | Overwrites every row — cannot be undone |
| `ALTER TABLE` | Schema changes belong in database migrations, not in test code |
| `CREATE TABLE` / `CREATE INDEX` | Same — schema is not managed here |
| `GRANT` / `REVOKE` | Permission changes are an infrastructure concern, not a test concern |
| Any other DDL (`CREATE`, `DROP`, `ALTER`, `RENAME`) | Test code must never modify schema |

If asked to write any of the above, **refuse and explain why**. Do not attempt a workaround.

### Allowed SQL and where it must live

All SQL must live in `shared/db-helpers.ts`. No exceptions.

| Operation | Allowed | Conditions |
|---|---|---|
| `SELECT` | Yes | Must include `WHERE` scoped to specific IDs or `company_id = ANY(qaCompanyIds)` |
| `DELETE` | Yes | Must include `WHERE` with at least one of: `user_id`, `legacy_user_id`, `employee_id`, `company_id`, `balance_uid`, `user_uid` |
| `UPDATE` | Only for explicit test state resets | Must include `WHERE` scoped to a specific record. Example: `UPDATE employment SET line_id = null WHERE legacy_user_id = $1` |
| `INSERT` | Only for fixture setup approved in advance | Must be scoped to QA company IDs from `seed-config.json` |

### Production database detection — stop and ask before writing any SQL if

- `ENV` is not explicitly `'dev'` or `'staging'`
- The DB host in `.env` does not look like a known QA host (expected pattern: contains `salary-hero` and `rds.amazonaws.com`)
- A plain `DB_NAME` key is present in `.env` instead of `DB_NAME_DEV` / `DB_NAME_STAGING` — this is a sign of a manually edited or old config that may point to an unknown database
- The target table is not in the known QA table list below
- You are asked to query or delete data without being given a specific user ID, employee ID, or company ID to scope the operation

**Known QA tables** (the only tables this codebase is permitted to touch):

```
users
employment
user_identity
user_balance
user_bank
user_provider
employee_profile
employee_profile_audit
```

If asked to write SQL targeting any other table, **stop and ask the user to confirm the table name and its FK relationships** before writing anything.

### Safe SQL checklist — run through this before writing any new query

```
[ ] Does the WHERE clause include at least one scoping column?
    (user_id / legacy_user_id / employee_id / company_id / balance_uid / user_uid)
[ ] Is the target table in the known QA table list above?
[ ] Is ENV explicitly 'dev' or 'staging'?
[ ] Is the operation scoped to QA company IDs from seed-config.json — never hardcoded IDs?
[ ] If DELETE: does hardDeleteEmployee() already cover this table?
    If yes — call hardDeleteEmployee() instead of writing a new DELETE.
[ ] If this touches a table not previously in db-helpers.ts:
    Stop and ask the user to confirm the table name and FK dependencies before proceeding.
[ ] Is this a DDL statement (DROP / TRUNCATE / ALTER / CREATE)?
    If yes — refuse. These are never permitted in test code.
```

### What to do if unsure

If there is any doubt about whether a SQL operation is safe — whether it might affect more rows than intended, touch an unknown table, or run against a non-QA database — **stop, describe what you were about to do, and ask the user to confirm** before writing or executing any SQL.

Never assume it is safe to proceed. The cost of asking is zero. The cost of an unscoped DELETE on a shared RDS instance is not.

---

**Last updated**: April 2026 — added Section 15 (UI tests out of scope), Section 16 (new test checklist), Section 17 (DB safety guardrails)
