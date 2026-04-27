---
name: qa-engineering-lead
description: QA coding standards, project-specific rules, and anti-patterns for this repo. Load when writing or reviewing test code.
---

# QA Engineering Lead — Standards Reference

## 1. Security

- Never hardcode credentials, API keys, or tokens in any file
- Load all secrets from `process.env` only — never default to weak values (`|| ''` is ok for non-secret config, never for passwords)
- Validate required env vars at startup and throw a named error if missing
- `.env` must be in `.gitignore`; `.env.example` must document every required variable with no real values
- Test data uses only test company IDs from `seed-config.json`, never production data
- Error messages must not expose credential values

## 2. Configuration — Single Source of Truth

- **Environment**: `shared/utils/env.ts` only. `shared/env-config.ts` is deprecated — do not use or import it.
- **Company IDs**: `getCompany('name')` from `shared/utils/seed-config.ts` only. Never hardcode numeric IDs.
- **OTP code**: `OTP` from `shared/utils/seed-config.ts` only — it reads `seed-config.json` per environment (`111111` for dev, `199119` for staging). Never import `OTP` from `env.ts` or hardcode any OTP value. Using the wrong OTP on staging sends a real SMS to a real person.
- **Base URLs**: `playwright.config.ts` only. No duplicate `API_HOST` maps in helpers.
- **Admin auth**: `getAdminToken()` from `api/helpers/admin-auth.ts` only (cached). `loginAsAdmin()` from `shared/auth.ts` is deprecated — do not use it. `shared/auth.ts` itself is deprecated.

## 3. DB Query Placement

- Raw SQL (`query(...)`) is permitted **only** in `shared/db-helpers.ts`.
- Test files (`.test.ts`) must **never** import `query` directly.
- Cleanup functions that touch the DB must live in `shared/db-helpers.ts`, not be defined inline in test files.
- There is no DB fallback for API operations. If the API delete fails, the test must surface that failure. `deleteEmployeeViaAPIWithFallback` is an anti-pattern — do not use or replicate it.

## 4. TypeScript

- No `any` types in test files. Use the correct interface (`EmployeeResponse`, etc.).
- No `as any` casts. Fix the underlying type instead — use `Partial<T>` for PATCH payloads.
- Run `npm run tsc` after every change. Fix all errors before running tests.
- Add dependencies to `package.json` before importing them.

## 5. Test File Standards

- File extension: `.test.ts` only. Never `.spec.ts`.
- Every logical action inside `test()`, `beforeAll()`, `beforeEach()`, `afterAll()`, `afterEach()` must be wrapped in `test.step()`.
- No dead imports. No unused exports.
- `OTP_REQUEST_HEADERS` in `api/helpers/request.ts` is unused — do not reference or replicate this pattern.

## 6. Identifier Generation

- All random identifiers (`resolvePhone`, `generateEmail`, `generateEmployeeId`, etc.) come from `api/helpers/identifiers.ts` only.
- Do not add a second `generateRandomString` or similar utility to `shared/employee-api.ts` or anywhere else.
- **Never call `generatePhone()` directly in test or seed code.** Always use `resolvePhone()` instead — it automatically selects `generatePhone()` on dev and `pickPhoneFromPool()` on staging. This applies to every context: seed profiles, test files, and payload builders.
- `generatePhone()` is a low-level primitive. It exists only to be called by `resolvePhone()` and must not be imported elsewhere.

## 7. Schema Completeness

- Every field asserted in a test body must be declared in the corresponding Zod schema.
- Optional feature-specific fields (e.g. `is_consent_accepted`, `line_id`) must be declared as `.optional()` in the shared `GetProfileSchema`.
- `z.object({}).passthrough()` is a temporary placeholder only — must include a `// TODO:` comment.

## 8. HTTP Layer

- All HTTP requests use the Playwright `request` context (or helpers that wrap it).
- `shared/api-client.ts` constructs absolute URLs by reading `shared/env-config.ts` — this bypasses Playwright's `baseURL` and is the wrong pattern. Prefer relative paths so `playwright.config.ts` controls the host.

## 9. Cleanup Strategy

- All test cleanup must use `hardDeleteEmployee(userId)` from `shared/db-helpers.ts`. The admin API soft delete (`deleteEmployee` / `deleteEmployeeViaAPI`) sets `deleted_at` but leaves records in place — soft-deleted phone numbers and `bank_account_no` values are still subject to the paycycle uniqueness constraint and will cause "already used in this paycycle" errors on subsequent test runs.
- `hardDeleteEmployee` runs inside a transaction and deletes in FK-safe order: `employee_profile_audit` → `employee_profile` → `user_bank` → `user_identity` → `employment` → `user_balance` → `users`.
- The only exception: the DELETE CRUD test case itself must use `deleteEmployeeViaAPI` to test the API endpoint, followed immediately by `hardDeleteEmployee` to clear the paycycle constraints.
- `deleteEmployee()` in `api/helpers/employee.ts` and `deleteEmployeeViaAPI()` in `shared/employee-api.ts` are kept solely for testing the soft-delete API behaviour. They must not be used for routine test cleanup.
- `deleteEmployeeProfileRecords()` in `shared/db-helpers.ts` remains for digital consent import cleanup only — it targets `employee_profile` / `employee_profile_audit` and is separate from `hardDeleteEmployee`.
- `user_provider` has **no FK constraint to `users`** — deleting from `users` does not cascade to `user_provider`. `hardDeleteEmployee()` explicitly deletes from `user_provider` before `users`. Never assume cascades cover this table.

## 10. Code Comments

- Comments explain "why", not "what".
- No section divider boxes. No narration comments. No test count annotations in describe labels.
- File-level JSDoc max ~15 lines.

## 11. Code Writing Standards — Prevention Habits

These five habits prevent the majority of bugs found in this codebase. Apply them before writing any function.

### Habit 1: Trace every type transformation end-to-end before writing

Before writing any function that converts a value, write out the type at input, after each operation, and at output. Ask: can any step produce `NaN`, `undefined`, `""`, or silently drop formatting (e.g. leading zeros)?

- Always pass a radix to `parseInt`: `parseInt(value, 10)`
- Always guard after numeric conversion: `if (isNaN(result) || result <= 0) throw new Error(...)`
- Never rely on `String(undefined)` being `"undefined"` — guard the source instead
- Phone numbers and IDs with leading zeros must use `.padStart(original.length, '0')` if numeric arithmetic is involved

### Habit 2: Never cast with `as T` — parse instead

`body.field as string` is a lie to the compiler. It produces `undefined` typed as `string` when the API shape changes or returns an error.

- If you control the type (your own code): use the typed variable directly
- If you don't control it (API response, `response.json()`, env var): use `ZodSchema.parse(value)` and use the typed result
- `validateSchema()` + `as string` is the wrong pattern — use `Schema.parse()` and discard the untyped variable entirely

### Habit 3: Validate at the boundary — fail loudly at startup

Every value crossing a trust boundary (env vars, config files, API responses) must be validated at the point it enters the system. A bad value must throw a clear, named error immediately — not travel silently and fail deep inside a test step.

- Credentials must be checked for presence before use — never default to `''`
- Config values that are required must throw if absent, not return `undefined` silently
- `parseInt`, `Number()`, and array index access are trust boundaries — validate their output

### Habit 4: Name every magic value

If a literal value requires knowledge outside the immediate line to understand, it needs a named constant or comment.

- Hardcoded numeric IDs (`3661`, `514`, `128`) must come from `getCompany()` or `seed-config.json` — never inline
- Hardcoded durations (`2000`, `1000`) must be named constants with a comment explaining the wait
- Sentinel values (`0` for "not configured", `''` for "missing") must use `undefined` or `null` in the type system instead

### Habit 5: Make the impossible unrepresentable

If a variable can be in an invalid state, the type system should reflect it — not a sentinel value that shares the type with valid data.

- Use `string | undefined` for optional credentials, not `string` defaulting to `''`
- Use `undefined` for uninitialised context, not a typed variable that is secretly unset
- Use `null` or `undefined` for absent values, not `0`, `''`, or `'TBD'`
- Throw early if a function's preconditions are not met rather than proceeding with broken state

## 12. Staging Phone Numbers — Critical Rule

The staging environment sends **real OTP messages** to real phone numbers. Only the approved test pool may be used.

- **Approved range**: `0881001500` – `0881001600` (101 numbers)
- **OTP bypass code**: `199119`
- **ref_code returned by API**: `salary-hero-bypass` (returned automatically for numbers in the pool)
- **Never call `generatePhone()` on staging** — it produces numbers outside the pool and will send a real OTP to a real person

The phone pool is configured in `shared/fixtures/seed-config.json` under `staging.phonePool`.
Use `pickPhoneFromPool(getPhonePool())` from `api/helpers/identifiers.ts` when `ENV === 'staging'`.
The `phoneSignupProfile` in `api/helpers/profiles/phone.ts` already handles this branching — do not bypass it.

## 13. Anti-Patterns (Do Not Replicate)

| Anti-pattern | Correct alternative |
|---|---|
| `shared/env-config.ts` | `shared/utils/env.ts` |
| `shared/auth.ts` / `loginAsAdmin()` | `api/helpers/admin-auth.ts` / `getAdminToken()` |
| `deleteEmployeeViaAPIWithFallback` | Direct `deleteEmployee()` via API |
| `shared/utils/request.ts` | Playwright `request` context directly |
| `shared/api-client.ts` with absolute URLs | Relative paths + Playwright `baseURL` |
| `let x: any` in test files | Typed response interface |
| Hardcoded `514` or `128` in helpers | `getCompany('digital_consent').id` |
| Hardcoded OTP `'111111'` or `'199119'` | `OTP` from `shared/utils/seed-config.ts` |
| `import { OTP } from 'shared/utils/env'` | `import { OTP } from 'shared/utils/seed-config'` |
| `generatePhone()` in test or seed code | `resolvePhone()` from `api/helpers/identifiers.ts` |
| Duplicate `API_HOST` map in helpers | `playwright.config.ts` `baseURL` |
| `query()` inside `.test.ts` | Named function in `shared/db-helpers.ts` |

---

**Last updated**: April 2026 — added code writing standards (section 11), staging phone pool rule (section 12), OTP single source of truth rule (section 2)
