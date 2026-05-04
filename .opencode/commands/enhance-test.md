---
description: Add a new test case to an existing test file
skill: qa-engineering-lead
---

# /enhance-test — Add a test case to an existing test file

Add a new test case to an existing test file.

**Arguments:** `$ARGUMENTS` — format: `<test-file-path> <TC-ID or description>`

**Examples:**
```
/enhance-test api/tests/digital-consent/digital-consent.test.ts TC-CONSENT-EID-005
/enhance-test api/tests/digital-consent/digital-consent.test.ts "add approval step after EID-only signup"
```

---

## Step 1 — Parse arguments

- Extract the file path (first argument) and the enhancement request (everything after)
- If the enhancement request starts with `TC-`, treat it as a TC ID lookup
- Otherwise treat it as free-form description

---

## Step 2 — Read the existing test file

Read the full target `.test.ts` file. Map:
- All `describe` blocks and their names
- All existing `test()` blocks with names and tags
- All imports and where they come from
- All shared variables (`adminToken`, `signedUpUserId`, etc.) and how they are declared
- The `afterEach` / `afterAll` cleanup pattern (how `signedUpUserId` is reset, what cleanup functions are called)

---

## Step 3 — Load requirements context

Derive the feature name from the file path (e.g. `api/tests/digital-consent/digital-consent.test.ts` → `digital-consent`).

Check if `.opencode/requirements/<feature>/test-cases.md` exists.

**If TC ID was given:**
- Find the exact matching entry in `test-cases.md`
- Read its full spec: steps, assertions, tags, teardown, preconditions
- Use this as the authoritative source of truth for the new test

**If free-form description was given:**
- Scan all `🔲 PLANNED` entries in `test-cases.md` for a close semantic match
- If a match is found, proceed using it as the spec
- If no match is found, or no requirements folder exists, proceed on the free-form description alone and print:
  ```
  ⚠ No matching planned test case found in requirements docs.
    Proceeding from description: "<description>"
    Consider running /plan-tests <feature> to document test cases before implementing them.
  ```

---

## Step 4 — Identify required infrastructure

Before writing any test code, check whether each of the following already exists:

| What | Where to check |
|------|----------------|
| Endpoint(s) used by the new test | `shared/endpoints.ts` |
| Helper function(s) for the new API calls | `api/helpers/<feature>-*.ts` or related helpers |
| Zod schema for the new API response(s) | `api/schema/<feature>.schema.ts` |
| DB helper for cleanup (only if no API delete exists) | `shared/db-helpers.ts` |

Collect the full list of missing pieces, then proceed directly to Step 5.

---

## Step 5 — Add missing infrastructure

Add only what is missing, in this order:

1. **`shared/endpoints.ts`** — add new endpoint string(s) to the relevant block
2. **`api/schema/<feature>.schema.ts`** — add Zod schema(s) for new response shape(s)
3. **`api/helpers/<feature>-flow.ts` or the relevant helper file** — add one function per new API call; each function makes one request, validates with `parseResponse()`, and returns what the test needs. Follow the JSDoc + single-responsibility pattern in `api/helpers/digital-consent-signup-api.ts`
4. **`shared/db-helpers.ts`** — only if the new test requires a DB cleanup that has no API equivalent

---

## Step 6 — Add the test case

Find the correct `describe` block:
- If TC ID was given: use the tags and feature context from the spec
- If free-form: use semantic matching against the describe block names in the file

Insert the new `test()` block **after the last existing `test()` in that describe block**, immediately before any `afterEach` / `afterAll` hooks.

Follow the style of the immediately preceding test exactly:
- Same variable declaration pattern (declare all `let` vars at the top of the test body)
- Same `test.step()` naming style (verb phrase, no emoji)
- Same cleanup variable assignment (e.g. `signedUpUserId = body.profile.user_id`)

**Mandatory for every test:**
- All four tag groups: `@component` or `@workflow`, `@high`/`@medium`/`@low`, `@smoke` or `@regression`, `@guardian`/`@avengers`/`@shared`
- Every action inside the test body wrapped in `test.step()`
- Validate every API response with `parseResponse()` from `shared/utils/response.ts`

**Test name format:**
```
API – <Feature> – <Scenario> – <Expected Result>
```

---

## Step 7 — Update requirements docs

If a matching entry was found in `test-cases.md`:
- Update its status from `🔲 PLANNED` to `⏳ IN PROGRESS`

Update `COVERAGE_MATRIX.md`:
- If the test was in the planned table: update its status row to `⏳ IN PROGRESS`
- If the test is new (not previously in the matrix): add a new row with status `⏳ IN PROGRESS`

---

## Step 8 — Run `yarn tsc`

Run `yarn tsc` and fix all type errors before finishing.

Print a summary of every file changed:
```
✓ shared/endpoints.ts            — added <endpoint name>
✓ api/schema/<feature>.schema.ts — added <SchemaName>
✓ api/helpers/<feature>-*.ts     — added <functionName>()
✓ api/tests/<path>.test.ts       — added test "<test name>"
✓ .opencode/requirements/...     — updated TC status
✓ yarn tsc — 0 errors
```

---

## Rules

- Never create a new test file — only modify the specified existing one
- Never modify existing test cases — only add new ones
- Never add test cases to more than one describe block per invocation
- Use `resolvePhone()` — never `generatePhone()` directly
- Use `getCompany('name')` — never hardcode company IDs
- No `any` types; no `as any` casts
- File extension must remain `.test.ts`
