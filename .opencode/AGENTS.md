# QA Tests — Project Coding Standards

Rules for every session in this repo. Load `.opencode/skills/qa-engineering-lead/SKILL.md` for detailed rationale and examples.

---

## DB Queries

- `query()` is permitted **only** in `shared/db-helpers.ts`
- `.test.ts` files must never import `query` directly
- Cleanup functions that touch the DB must live in `shared/db-helpers.ts`
- No DB fallback for API failures — surface the API error

## DB Safety

**These SQL operations are forbidden. Never write them under any circumstances:**

- `DROP TABLE` / `DROP DATABASE` / `TRUNCATE`
- `DELETE` or `UPDATE` without a `WHERE` clause
- `ALTER TABLE` / `CREATE TABLE` / any DDL statement
- `GRANT` / `REVOKE`

**Before writing any SQL, verify:**

- `ENV` is `'dev'` or `'staging'` — if not, stop and ask
- `WHERE` clause is scoped to specific IDs (`user_id`, `employee_id`, `company_id`) — never unscoped
- Target table is in the known list: `users`, `employment`, `user_identity`, `user_balance`, `user_bank`, `user_provider`, `employee_profile`, `employee_profile_audit`, `company_user_sites`
- For DELETE: check if `hardDeleteEmployee()` already covers this — use it instead of a new query

**If any of the above cannot be confirmed — stop and ask the user before writing or running any SQL.**

See SKILL.md Section 17 for the full safe SQL checklist and rationale.

## Configuration

- **Env vars**: `shared/utils/env.ts` only — never `shared/env-config.ts` (deprecated)
- **Company IDs**: `getCompany('name')` from `shared/utils/seed-config.ts` — never hardcoded numbers
- **Base URLs**: `playwright.config.ts` only — no `API_HOST` maps in helpers
- **Admin auth**: `getAdminToken()` from `api/helpers/admin-auth.ts` — never `loginAsAdmin()` or `shared/auth.ts` (both deprecated)

## TypeScript

- No `any` types in test files — use typed interfaces (`EmployeeResponse`, etc.)
- No `as any` casts — use `Partial<T>` for PATCH payloads
- `npm run tsc` must pass with zero errors before running tests
- Install packages in `package.json` before importing them

## Test Files

- Extension: `.test.ts` only — never `.spec.ts`
- Every action in `test()`, `beforeAll()`, `afterAll()`, `beforeEach()`, `afterEach()` must be wrapped in `test.step()`
- No unused imports; no dead exports
- Every field asserted in a test must be declared in the corresponding Zod schema (use `.optional()` for feature-specific fields)

## Identifiers

- All random identifier generators live in `api/helpers/identifiers.ts` only
- Do not add `generateRandomString` or similar to `shared/` or other helpers

## HTTP

- All requests use the Playwright `request` context (or helpers that wrap it)
- `shared/api-client.ts` constructs absolute URLs — avoid for new code; use relative paths

## Deprecated — Do Not Use or Replicate

| Deprecated | Use instead |
|---|---|
| `shared/env-config.ts` | `shared/utils/env.ts` |
| `shared/auth.ts` / `loginAsAdmin()` | `api/helpers/admin-auth.ts` / `getAdminToken()` |
| `shared/utils/request.ts` | Playwright `request` context |
| `deleteEmployeeViaAPIWithFallback` | Direct `deleteEmployee()` API call |
| `as any` / `let x: any` | Typed interface or `Partial<T>` |
| Hardcoded company IDs (`514`, `128`) | `getCompany('name').id` |
| `query()` in `.test.ts` | Named function in `shared/db-helpers.ts` |

## Plans and Notes

Personal working docs go in `.opencode/plans/` (gitignored).
Requirements docs go in `.opencode/requirements/<feature>/`.
Never create `.md` files in the project root or `docs/` unless explicitly asked.

## Git

Never commit, push, or create pull requests unless explicitly asked.
