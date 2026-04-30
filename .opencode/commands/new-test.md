---
description: Scaffold a new test feature following project structure and standards
skill: qa-engineering-lead
---

# /new-test — Phase 3: Scaffold Test Code

Scaffold test code for the feature named `$ARGUMENTS`. Follow all rules in `.opencode/AGENTS.md`.

---

## Step 1 — Check for existing requirements

Check whether `.opencode/requirements/<feature-name>/` exists and contains `test-cases.md` and `api-contract.md`.

**If requirements exist:** Read `test-cases.md`, `api-contract.md`, and `test-data.md` before generating any code. Use them to:
- Name test cases and `describe` blocks accurately
- Use the correct endpoints and payload shapes from `api-contract.md`
- Use the correct identifiers and fixed values from `test-data.md`
- Include the correct tags from each test case in `test-cases.md`

**If requirements do not exist:** Proceed with best-effort scaffolding, but print a warning:
```
⚠ No requirements found at .opencode/requirements/<feature-name>/
  Consider running /analyse-feature and /plan-tests first for better accuracy.
```

---

## Step 2 — Create these files

1. **`api/tests/<feature-name>/<feature-name>.test.ts`** — test file with:
   - `describe` block named after the feature
   - `test.describe.configure({ mode: 'serial' })` at the top of the describe block
   - `beforeAll` for seeding (admin token, seed employee if needed)
   - `afterAll` / `afterEach` for cleanup
   - One `test()` block per test case in `test-cases.md` (or placeholder if no requirements)
   - Every action inside hooks and tests wrapped in `test.step()`
   - All four mandatory tags on every `test()` call

2. **`api/helpers/<feature-name>-flow.ts`** — feature-specific API call helper (no DB queries)

3. **`api/schema/<feature-name>.schema.ts`** — Zod schemas for all API responses from `api-contract.md`

4. **`shared/endpoints.ts`** — add a `<featureName>:` block with all endpoint strings from `api-contract.md`

5. **`.opencode/requirements/<feature-name>/`** — if this directory does not already exist, create it with all five files:
   - `README.md`
   - `api-contract.md`
   - `test-requirements.md`
   - `test-data.md`
   - `test-cases.md`

6. **`COVERAGE_MATRIX.md`** — if requirements already exist and `test-cases.md` rows have `🔲 PLANNED` status, update those rows to `⏳ IN PROGRESS` now that code is being written.

---

## Step 3 — DB cleanup helpers (if needed)

If no API delete endpoint exists for cleanup, add named functions to `shared/db-helpers.ts` — never inline in the test file.

Use `hardDeleteEmployee()` as the reference pattern.

---

## Step 4 — Verify

Run `yarn tsc` and fix all type errors before finishing.

Print a summary of files created/modified.

---

## Rules

- Use `getCompany('name')` for company IDs — never hardcode numbers
- Use `resolvePhone()` — never `generatePhone()` directly
- Use `generateEmail()` / `generateEmployeeId()` from `api/helpers/identifiers.ts`
- Use `getAdminToken()` from `api/helpers/admin-auth.ts`
- File extension: `.test.ts` — never `.spec.ts`
- No `any` types; no `as any` casts
- Validate every API response with `parseResponse()` from `shared/utils/response.ts`
- Run `yarn tsc` after every change — zero errors required
