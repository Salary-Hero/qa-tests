---
description: "Phase 1 — Analyse a feature: read API collections and business context, generate requirement docs"
skill: qa-engineering-lead
---

# /analyse-feature — Phase 1: Feature Analysis

You are helping a QA engineer analyse a new feature before writing any tests.

**Arguments:** `$ARGUMENTS` — format: `<feature-name> [context-source]`

- `feature-name` — snake_case or kebab-case identifier (e.g. `company-management`, `digital_consent`)
- `context-source` (optional) — a file path to a markdown brief OR a Confluence/ticket URL. If omitted, the command will look for a `BRIEF.md` file first before asking.

---

## Step 1 — Gather business context

**First — always check for BRIEF.md:**
Check if `.opencode/requirements/<feature-name>/BRIEF.md` exists. If it does, read it as the primary business context regardless of whether a `context-source` argument was also provided.

**Then — if a `context-source` argument was given:**

If `context-source` is a URL:
- Fetch the page with WebFetch and extract: feature purpose, user flows, business rules, edge cases, error handling requirements.
- Merge with anything already gathered from `BRIEF.md`.

If `context-source` is a file path (and it is not `BRIEF.md`):
- Read the file and extract the same information.
- Merge with anything already gathered from `BRIEF.md`.

**If neither `BRIEF.md` exists nor a `context-source` was given:**
- Ask: "Please either create `.opencode/requirements/<feature-name>/BRIEF.md` with your notes, or provide a Confluence/ticket URL, and I'll extract the business context from it."

---

## Step 2 — Locate API collection

Read `.opencode/plans/collection-paths.md` to get the Postman and Bruno collection paths.

Search both collections for requests related to `<feature-name>`:
- In Bruno: look for `.bru` files whose folder name or request name contains any keyword from the feature name
- In Postman: look for request items in the JSON collection whose `name` or `url` contains any keyword from the feature name

For each matching endpoint, extract:
- HTTP method
- URL path (parametrised form, e.g. `/v1/admin/companies/:companyId`)
- Request body structure (fields, types)
- Response body structure (fields, types, status codes)
- Auth headers

If the collection paths are not yet filled in (still show `/Users/admin/Workspace/`), tell the user: "Please fill in your collection paths in `.opencode/plans/collection-paths.md` and run this command again."

---

## Step 3 — Generate requirement docs

Create the directory `.opencode/requirements/<feature-name>/` if it does not exist.

Generate all four files below. Base content on what you extracted in Steps 1 and 2. Use the `employee` folder at `.opencode/requirements/employee/` as the canonical format reference.

### `README.md`
- Feature name and one-paragraph summary
- Test file path (placeholder: `api/tests/<feature-name>/<feature-name>.test.ts`)
- Documents table linking the other four files
- Quick reference table listing known test cases (use placeholders like `TC-<FEATURE>-001` if not yet defined)
- Auth method used

### `api-contract.md`
- Base URL
- For each endpoint found in Step 2:
  - Method + path
  - Full request body with field names and example values
  - Full response body (success case) with field names and types
  - All status codes and what triggers each
  - Any read-only fields that must NOT appear in update payloads
  - Type quirks (e.g. ID returned as string but must be sent as number)
- Error response format

### `test-requirements.md`
- Objectives (numbered list — what must be verified)
- In-scope endpoints and operations
- Out-of-scope items
- Pass/fail criteria
- Risks table: risk, impact (🔴/🟡/🟢), mitigation

### `test-data.md`
- Generated identifiers table: field, generator function, example, uniqueness constraint
- Fixed values table: field, value, reason (use `getCompany('name')` — never hardcode IDs)
- Field constraints table: field, constraint, consequence if violated
- Cleanup strategy

---

## Step 4 — Print summary and next step

After writing all four files, print:

```
✓ Requirements written to .opencode/requirements/<feature-name>/
  README.md
  api-contract.md
  test-requirements.md
  test-data.md

Next step — review the docs, then run:
  /plan-tests <feature-name>
```

Do NOT create `test-cases.md` — that is Phase 2's job.
Do NOT update `COVERAGE_MATRIX.md` — that is Phase 2's job.
Do NOT scaffold any code — that is Phase 3's job.
