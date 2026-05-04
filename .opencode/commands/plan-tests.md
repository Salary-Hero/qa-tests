---
description: "Phase 2 — Plan tests: read requirement docs and generate test-cases.md for review before saving"
skill: qa-engineering-lead
---

# /plan-tests — Phase 2: Test Case Planning

You are helping a QA engineer plan test cases for a feature that has already been analysed.

**Arguments:** `$ARGUMENTS` — format: `<feature-name>`

---

## Step 1 — Verify requirements exist

Check that `.opencode/requirements/<feature-name>/` exists and contains at least:
- `api-contract.md`
- `test-requirements.md`
- `test-data.md`

If any of these files are missing, stop and tell the user:

```
Requirements docs for '<feature-name>' are incomplete.
Run /analyse-feature <feature-name> first, then come back.
```

---

## Step 2 — Read all requirement docs

Read all files in `.opencode/requirements/<feature-name>/`:
- `BRIEF.md` — if it exists, read it first for raw context and edge cases the junior QA captured in plain language
- `README.md` — feature overview and auth
- `api-contract.md` — endpoints, request/response shapes, status codes, type quirks
- `test-requirements.md` — objectives, scope, risks
- `test-data.md` — identifiers, fixed values, constraints, cleanup strategy

If `BRIEF.md` contains information not yet reflected in the other docs (e.g. edge cases, out-of-scope notes, open questions), factor it into the test case plan.

---

## Step 3 — Draft test cases

Plan test cases covering:

### Happy path cases
For each endpoint in `api-contract.md`, design at least one happy path test:
- Full successful flow (create → verify → cleanup)
- Read/verification tests where a GET equivalent exists
- Update tests verifying changed fields + unchanged fields retained
- Delete tests verifying cascade or DB state

### Negative / edge cases
Based on the risks in `test-requirements.md` and the constraints in `test-data.md`, design negative cases:
- Duplicate unique field → expect 409
- Missing required field → expect 400 or 422
- Read-only field in PATCH → expect 403
- Non-existent resource → expect 404
- Type mismatch for fields with known quirks (e.g. `paycycle_id` string vs number)
- Auth failures (missing or invalid token) → expect 401/403

### Test ID scheme
Derive a short prefix from the feature name (e.g. `company-management` → `CMGMT`, `digital-consent` → `CONSENT`).

Happy path: `TC-<PREFIX>-001`, `TC-<PREFIX>-002`, …
Negative: `TC-<PREFIX>-NEG-001`, `TC-<PREFIX>-NEG-002`, …

### For each test case, document
- **ID** and **title**
- **Priority:** Critical / High / Medium / Low
- **Status:** 🔲 PLANNED
- **Preconditions:** what must exist before this test runs
- **Steps:** numbered, specific (include exact endpoint, payload fields, assertion values)
- **Pass when:** concrete acceptance criteria (status code, field values, DB state)
- **Fails if:** common failure modes
- **Teardown:** how to clean up after this test
- **Tags:** all four mandatory tags — `@component/@workflow`, `@high/@medium/@low`, `@smoke/@regression`, `@guardian/@avengers/@shared`

Mark smoke tests (`@smoke`) on the one or two most critical happy-path cases per feature.

Use `.opencode/requirements/employee/test-cases.md` as the canonical format reference.

---

## Step 4 — Show plan for review, wait for approval

Print the full generated `test-cases.md` content to the terminal.

Then print:

```
--- Review the plan above ---

Does this look right?
- Reply "approve" to save and update COVERAGE_MATRIX.md
- Reply with corrections to revise before saving
```

**Wait for the user's response. Do NOT save any file until explicitly approved.**

---

## Step 5 — On approval: save and update matrix

Once the user approves (any reply containing "approve", "yes", "ok", "lgtm", "looks good", or equivalent):

1. **Save** the plan to `.opencode/requirements/<feature-name>/test-cases.md`

2. **Update** `.opencode/requirements/COVERAGE_MATRIX.md`:
   - Add a new row per planned test case in the `## Planned: Negative Test Cases` section (for negative cases)
   - Add new rows in the `## Test Cases` table with status `🔲 PLANNED` (for happy path cases)
   - Update the `## Summary by Feature` table to include the new feature row
   - Update the `Last updated` date and the counts at the top

3. Print:

```
✓ Saved .opencode/requirements/<feature-name>/test-cases.md
✓ Updated .opencode/requirements/COVERAGE_MATRIX.md

Next step — when ready to scaffold test code, run:
  /new-test <feature-name>
```

---

## Rules

- Never create code files — only markdown
- Never update `COVERAGE_MATRIX.md` before the user approves the plan
- Never skip the review step — always print and wait
- Tag every test with all four mandatory tag groups
- Use `resolvePhone()` not `generatePhone()` in step descriptions
- Reference `getCompany('name')` not hardcoded IDs in step descriptions
