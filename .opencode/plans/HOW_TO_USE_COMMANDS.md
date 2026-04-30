# How to Write Tests Using the 3-Phase Workflow

This guide walks you through the full process of going from a new feature brief to working test code. There are three phases, each with its own command. You always do them in order.

```
Phase 1 — /analyse-feature    →   reads your notes + API collection, writes requirement docs
Phase 2 — /plan-tests         →   reads requirement docs, drafts test cases for your review
Phase 3 — /new-test           →   reads test cases, scaffolds the actual .test.ts code
```

---

## Before You Start: One-Time Setup

Open `.opencode/plans/collection-paths.md` and fill in the paths to your Postman or Bruno collection files. The AI reads them to extract endpoint details. You only need to do this once.

---

## Phase 1 — Analyse the Feature

**Command:**
```
/analyse-feature <feature-name>
```

**What it does:** Reads your BRIEF.md (see below) and the API collection, then writes four requirement docs into `.opencode/requirements/<feature-name>/`:

| File | What it contains |
|------|-----------------|
| `README.md` | Feature summary, test file path, quick reference |
| `api-contract.md` | Every endpoint: method, URL, full request/response, status codes |
| `test-requirements.md` | Objectives, scope, risks |
| `test-data.md` | What identifiers to generate, fixed values, constraints, cleanup strategy |

**Before running this command, write a BRIEF.md:**

Create the file at `.opencode/requirements/<feature-name>/BRIEF.md`. You can copy the template from `.opencode/requirements/_TEMPLATE/BRIEF.md`. Write in plain language — no special format required. The AI will do the conversion.

A good BRIEF.md covers:

- What the feature does in one paragraph
- The step-by-step user flow (numbered)
- Business rules the API must enforce
- Any endpoint paths you already know
- What is explicitly out of scope
- Open questions or anything you are unsure about

**Example:**

For a feature called `company-management`:

```
/analyse-feature company-management
```

The AI will look for `.opencode/requirements/company-management/BRIEF.md`, read it, search the API collection for company-related endpoints, and write all four docs.

**After this command runs:** Review the four docs. If anything looks wrong (wrong endpoint, missing business rule, wrong field type), edit the docs manually before moving to Phase 2. The docs are the source of truth for everything that follows.

---

## Phase 2 — Plan the Tests

**Command:**
```
/plan-tests <feature-name>
```

**What it does:** Reads all four requirement docs and drafts `test-cases.md` — a full list of test cases with steps, assertions, tags, and teardown instructions. It prints the draft to the terminal and **waits for your approval before saving anything**.

**What to look for when reviewing:**

- Are all the important happy paths covered?
- Are negative cases included (missing field, duplicate value, wrong auth)?
- Does each test case have all four mandatory tags?
  - `@component` or `@workflow`
  - `@high`, `@medium`, or `@low`
  - `@smoke` or `@regression`
  - `@guardian`, `@avengers`, or `@shared`
- Are the test IDs in the right format? (`TC-<PREFIX>-001` for happy path, `TC-<PREFIX>-NEG-001` for negative)

**To approve:** Reply with `approve`, `yes`, `ok`, or `looks good`.

**To request changes:** Describe what needs to change. The AI will revise and show you the updated plan before saving.

Once approved, it saves `test-cases.md` and updates `COVERAGE_MATRIX.md` automatically.

**Example:**

```
/plan-tests company-management
```

---

## Phase 3 — Write the Test Code

**Command:**
```
/new-test <feature-name>
```

**What it does:** Reads `test-cases.md`, `api-contract.md`, and `test-data.md`, then scaffolds:

| File | What gets created |
|------|------------------|
| `api/tests/<feature-name>/<feature-name>.test.ts` | Full test file with `describe`, `beforeAll`, `afterAll`, `afterEach`, and one `test()` per test case |
| `api/helpers/<feature-name>-flow.ts` | API call helper functions |
| `api/schema/<feature-name>.schema.ts` | Zod schemas for all API responses |
| `shared/endpoints.ts` | New endpoint strings added to the relevant block |
| `shared/db-helpers.ts` | Cleanup functions added if no API delete exists |

After writing, it runs `yarn tsc` and fixes any type errors.

**Example:**

```
/new-test company-management
```

**After this command runs:** The tests are scaffolded but not necessarily passing. You may still need to:

- Fill in any placeholder values
- Run the tests and fix any runtime failures
- Update `COVERAGE_MATRIX.md` to change statuses from `⏳ IN PROGRESS` to `✅ DONE` when tests pass

---

## Adding a Test to an Existing File

**Command:**
```
/enhance-test <test-file-path> <TC-ID or description>
```

Use this when you want to add one new test case to a file that already exists — without touching any existing tests.

**With a TC ID** (the test case is already planned in `test-cases.md`):

```
/enhance-test api/tests/digital-consent/digital-consent.test.ts TC-CONSENT-EID-005
```

The AI reads the full spec from `test-cases.md` and uses it as the source of truth.

**With a free-form description** (the test isn't planned yet):

```
/enhance-test api/tests/digital-consent/digital-consent.test.ts "add rejection flow after pending_review"
```

The AI searches for a close match in `test-cases.md`. If it finds one, it uses that spec. If not, it proceeds from your description and warns you that the test isn't documented.

**What it does:** Adds only the missing infrastructure (endpoint, Zod schema, helper function, DB cleanup) then inserts the new `test()` block after the last existing test in the correct `describe` block. Updates `test-cases.md` status and `COVERAGE_MATRIX.md`.

---

## Utility Commands

| Command | What it does |
|---------|--------------|
| `/check-test <file>` | Reviews a test file against all coding standards. Reports issues but makes no changes. |
| `/clean-code <file>` | Same review, but fixes everything it finds automatically. Runs `yarn tsc` at the end. |
| `/run-tests <file>` | Runs the test file and reports results. |
| `/type-check` | Runs `yarn tsc` and reports all type errors. |
| `/pr` | Drafts a pull request description based on the current branch diff. |

---

## End-to-End Cheat Sheet

Starting a brand-new feature from scratch:

```
# 1. Write your notes
# Create .opencode/requirements/<feature-name>/BRIEF.md and fill it in

# 2. Analyse
/analyse-feature <feature-name>
# → review the 4 docs, edit if needed

# 3. Plan
/plan-tests <feature-name>
# → review the plan, reply "approve" when happy

# 4. Scaffold
/new-test <feature-name>
# → review the generated files, run the tests

# 5. Add more tests later
/enhance-test api/tests/<feature-name>/<feature-name>.test.ts <TC-ID>
```

---

## Tips for Writing a Good BRIEF.md

**Do:**
- Write in plain English, bullet points are fine
- Include the step-by-step user flow even if it seems obvious
- Note any business rules that the API must enforce (e.g. "you can't approve an employee who hasn't submitted a form")
- List endpoints you already know, even if just the method and path
- Write down open questions — the AI will flag them in `test-requirements.md`

**Don't:**
- Worry about formatting — there is no required structure
- Skip edge cases — if you know about a tricky situation, write it down
- Try to write test cases yourself — that is Phase 2's job

**The more context you give in BRIEF.md, the more accurate the requirement docs will be, and the less you will need to correct them before planning.**
