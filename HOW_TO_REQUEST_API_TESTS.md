# How to Request API Tests from the AI

This guide explains how to use the OpenCode AI agent to write, review, and maintain tests in this repo.

---

## The 3-Phase Workflow

New tests are built in three phases. Each phase has a dedicated slash command.

```
/analyse-feature <feature>   ← Phase 1: Read API contracts, generate requirement docs
/plan-tests <feature>        ← Phase 2: Draft test cases, wait for your approval
/new-test <feature>          ← Phase 3: Scaffold the actual test code
```

Run them in order. Each phase depends on the output of the previous one.

---

### Phase 1 — Analyse

```
/analyse-feature digital-consent
```

The agent will:
- Read your `BRIEF.md` if one exists at `.opencode/requirements/<feature>/BRIEF.md`
- Optionally fetch a Confluence or Jira URL you pass as a second argument
- Search the Bruno / Postman collections for matching API endpoints
- Generate four requirement docs under `.opencode/requirements/<feature>/`:
  - `README.md` — feature overview
  - `api-contract.md` — endpoints, payloads, status codes, type quirks
  - `test-requirements.md` — objectives, scope, risks
  - `test-data.md` — identifiers, constraints, cleanup strategy

**Tip:** Write a plain-language brief first. Create `.opencode/requirements/<feature>/BRIEF.md` with your notes — edge cases, out-of-scope items, known gotchas. The agent reads this before anything else.

---

### Phase 2 — Plan

```
/plan-tests digital-consent
```

The agent will:
- Read all requirement docs from Phase 1
- Draft happy-path and negative test cases with IDs, tags, steps, and pass criteria
- **Print the full plan to the terminal and wait for your approval before saving anything**

Reply `approve` (or `yes`, `lgtm`, `looks good`) to save `test-cases.md` and update `COVERAGE_MATRIX.md`.

Reply with corrections to revise the plan before saving.

---

### Phase 3 — Scaffold

```
/new-test digital-consent
```

The agent will:
1. Run `qa-infrastructure-verifier` to confirm the environment is healthy
2. Read `test-cases.md` from Phase 2
3. Create:
   - `api/tests/<feature>/<feature>.test.ts` — the test file
   - `api/helpers/<feature>-flow.ts` — reusable API call helpers
   - `api/schema/<feature>.schema.ts` — Zod response schemas
   - Entries in `shared/endpoints.ts` for any new URLs
   - DB cleanup helpers in `shared/db-helpers.ts` if needed
4. Run `yarn tsc` and fix all type errors before finishing

---

## Other Commands

### Add a test case to an existing file

```
/enhance-test api/tests/digital-consent/digital-consent.test.ts TC-CONSENT-005
/enhance-test api/tests/digital-consent/digital-consent.test.ts "add rejection case after EID mismatch"
```

Pass a TC ID to use the exact spec from `test-cases.md`, or a free-form description to add a new case.

---

### Review a test file for violations

```
/check-test api/tests/employee/employee.test.ts
```

Reports every violation — security, standards, types, patterns — with severity and suggested fix. Does **not** make changes.

---

### Review and fix a test file

```
/fix-test api/tests/employee/employee.test.ts
```

Same checks as `/check-test`, but immediately applies all fixes and runs `yarn tsc` at the end.

---

### Clean up code quality in any file

```
/clean-code api/helpers/signup-flow.ts
```

Fixes security issues, DB placement, auth helpers, hardcoded IDs, TypeScript issues, missing `test.step()` wrappers, and dead imports. Then runs `yarn tsc`.

---

### Run the test suite

```
/run-tests
```

Runs `npm run test:api` and interprets the results — groups failures by category (infra, data state, code bug, type error) and suggests fixes for each.

---

### Fix TypeScript errors

```
/type-check
```

Runs `yarn tsc`, groups errors by file, fixes them all, and re-runs until zero errors.

---

### Write a PR description

```
/pr
```

Reads git history, changed files, and `COVERAGE_MATRIX.md` to produce a PR body. Saves the draft to `.opencode/plans/pr/<branch-name>.md`. Does **not** open a PR or commit anything.

---

## Agents (run automatically by commands)

| Agent | Invoked by | What it does |
|---|---|---|
| `qa-infrastructure-verifier` | `/new-test` Step 0 | Checks dependencies, `yarn tsc`, env vars, git state, Playwright |
| `qa-code-reviewer` | `/check-test` | Read-only review — reports issues, never edits |
| `qa-pr-writer` | `/pr` | Writes PR description from git diff + coverage matrix |
| `qa-security-auditor` | Manual | Audits for credential exposure and compliance |
| `qa-test-planner` | Manual | Plans test strategies for complex features |

To invoke an agent manually, describe what you want in plain language — the agent will be selected automatically.

---

## Where Files Live

| What you need | Where it goes |
|---|---|
| Raw SQL queries | `shared/db-helpers.ts` only |
| Env vars and credentials | `shared/utils/env.ts` |
| Company IDs, OTP, PINCODE | `shared/utils/seed-config.ts` |
| API endpoint URL strings | `shared/endpoints.ts` |
| Random identifier generators | `api/helpers/identifiers.ts` |
| Zod response schemas | `api/schema/{feature}.schema.ts` |
| Reusable API call sequences | `api/helpers/{feature}-flow.ts` |
| Seed / cleanup profiles | `api/helpers/profiles/{auth-method}.ts` |
| Test files | `api/tests/{feature}/{feature}.test.ts` |
| Requirement docs (committed) | `.opencode/requirements/{feature}/` |
| Personal notes and plans | `.opencode/plans/` (gitignored) |

---

## Key Rules to Remember

- **Never call `generatePhone()` directly** — always use `resolvePhone()`. On staging, wrong phone numbers send real SMS messages.
- **Never hardcode company IDs** — use `getCompany('name')` from `seed-config.ts`.
- **Always use `parseResponse()`** from `shared/utils/response.ts` to validate API responses — never manual status check + cast.
- **Always use `hardDeleteEmployee()`** for test cleanup — soft delete leaves data that breaks subsequent test runs.
- **Run `yarn tsc` after every change** — zero errors required before running tests.
- **File extension is `.test.ts`** — never `.spec.ts`.
- **Every action inside a test hook or test body must be wrapped in `test.step()`**.

Full standards reference: `.opencode/skills/qa-engineering-lead/SKILL.md`
