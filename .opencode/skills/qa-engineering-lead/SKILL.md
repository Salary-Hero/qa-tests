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

- All random identifiers (`generatePhone`, `generateEmail`, `generateEmployeeId`, etc.) come from `api/helpers/identifiers.ts` only.
- Do not add a second `generateRandomString` or similar utility to `shared/employee-api.ts` or anywhere else.

## 7. Schema Completeness

- Every field asserted in a test body must be declared in the corresponding Zod schema.
- Optional feature-specific fields (e.g. `is_consent_accepted`, `line_id`) must be declared as `.optional()` in the shared `GetProfileSchema`.
- `z.object({}).passthrough()` is a temporary placeholder only — must include a `// TODO:` comment.

## 8. HTTP Layer

- All HTTP requests use the Playwright `request` context (or helpers that wrap it).
- `shared/api-client.ts` constructs absolute URLs by reading `shared/env-config.ts` — this bypasses Playwright's `baseURL` and is the wrong pattern. Prefer relative paths so `playwright.config.ts` controls the host.

## 9. Cleanup Strategy

- Cleanup goes through the admin API. No direct DB deletes as fallback.
- Delete order for consent cleanup: `user_identity` rows via admin API → then `employee_profile_audit` → `employee_profile` (only these two tables require DB because they have no delete API).

## 10. Code Comments

- Comments explain "why", not "what".
- No section divider boxes. No narration comments. No test count annotations in describe labels.
- File-level JSDoc max ~15 lines.

## 11. Anti-Patterns (Do Not Replicate)

| Anti-pattern | Correct alternative |
|---|---|
| `shared/env-config.ts` | `shared/utils/env.ts` |
| `shared/auth.ts` / `loginAsAdmin()` | `api/helpers/admin-auth.ts` / `getAdminToken()` |
| `deleteEmployeeViaAPIWithFallback` | Direct `deleteEmployee()` via API |
| `shared/utils/request.ts` | Playwright `request` context directly |
| `shared/api-client.ts` with absolute URLs | Relative paths + Playwright `baseURL` |
| `let x: any` in test files | Typed response interface |
| Hardcoded `514` or `128` in helpers | `getCompany('digital_consent').id` |
| Duplicate `API_HOST` map in helpers | `playwright.config.ts` `baseURL` |
| `query()` inside `.test.ts` | Named function in `shared/db-helpers.ts` |

---

**Last updated**: April 2026
