---
description: Scaffold a new test feature following project structure and standards
---

Scaffold a new test feature named `$ARGUMENTS`. Follow all rules in `.opencode/AGENTS.md`.

Create these files:
1. `api/tests/$1/$1.test.ts` — test file with `describe`, `beforeAll`, `afterAll`, `afterEach`, and placeholder `test()` blocks using `test.step()`
2. `api/helpers/$1.ts` — feature-specific helper (API calls only, no DB queries)
3. `api/schema/$1.schema.ts` — Zod schemas for all API responses
4. Update `shared/endpoints.ts` — add a `$1:` block with all endpoint strings
5. Create `.opencode/requirements/$1/` with these files:
   - `README.md` — feature overview and flow summary
   - `test-requirements.md` — what must be tested and why
   - `api-contract.md` — endpoint list with method, path, request/response shapes
   - `test-data.md` — fixture data, company IDs, test identifiers
   - `test-cases.md` — test case table (ID, name, steps, expected result)
6. Update `.opencode/requirements/COVERAGE_MATRIX.md` — add new rows for the planned tests

If a DB cleanup helper is needed (no API delete exists), add named functions to `shared/db-helpers.ts` — not inline in the test file.

Use `getCompany('name')` for company IDs — never hardcode numbers.
Use `generatePhone()` / `generateEmail()` from `api/helpers/identifiers.ts` for fresh identifiers.
Use `getAdminToken()` from `api/helpers/admin-auth.ts` for admin auth.

After scaffolding, run `npm run tsc` to confirm zero type errors.
