# How to Request API Tests

This is a guide for how to get new API tests written for this repo with minimal manual work.

## TL;DR

Give the AI agent two things:

1. Path to the Bruno collection folder for the endpoints
2. A short requirement file (optional but recommended)

The agent handles the rest.

---

## The 5-step workflow

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. You share Bruno path + (optional) requirement file            │
│ 2. Agent generates test cases in Testomat Markdown format        │
│ 3. You review + approve / adjust the test case list              │
│ 4. Agent generates Playwright test code + Zod schemas            │
│ 5. Agent runs `yarn tsc` + `yarn test:api` to verify             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Share context

Minimum message:

> "Write API tests for `<feature>`. Bruno: `<absolute path to Bruno folder>`."

With requirement file (recommended):

> "Write API tests for `<feature>`. Bruno: `<path>`. Requirement: `requirements/<feature>.md`."

### What Bruno provides

- Method, URL, headers, auth
- Request body (JSON, form-urlencoded, multipart)
- Success and error response examples
- Inline docs

### What the requirement file provides

- Business context / user flow
- Test data lifecycle (seed / cleanup order)
- Must-cover scenarios list
- Environment-specific values (OTP per env, etc.)

Use the template at `requirements/_TEMPLATE.md` (in the `ai-tools` repo).

---

## Step 2 — Test cases generated

Output: `.opencode/plans/test-cases-<feature>.md` in Testomat Markdown format.

Includes:

- Happy path
- Validation errors (missing/invalid fields)
- State-dependent errors (invalid OTP, duplicate signup, etc.)
- Auth errors (if applicable)

---

## Step 3 — Review

Tell the agent:

- "Skip test case #5"
- "Add an empty-string phone case"
- "Proceed"

Reviewing Markdown is cheap. Catching gaps here is much faster than after code is written.

---

## Step 4 — Code generated

Files the agent will create or update:

| File                                    | Purpose                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `shared/endpoints.ts`                   | Endpoint constants (appended, no duplication)                                   |
| `shared/fixtures/seed-config.json`      | Per-env company IDs + fixed identifiers (updated if a new auth method is added) |
| `api/schema/<feature>.schema.ts`        | Zod schemas derived from Bruno examples                                         |
| `api/helpers/profiles/<method>.ts`      | `SeedProfile` for this auth method (see "Seed Profiles" below)                  |
| `api/helpers/<domain>.ts`               | Low-level admin API helpers                                                     |
| `api/tests/<feature>/<feature>.test.ts` | Test spec using `seedFromProfile` / `cleanupFromProfile`                        |
| `shared/fixtures/<feature>.json`        | Test data (only if not reusable)                                                |

Conventions:

- `helpers/` — functions
- `helpers/profiles/` — one `SeedProfile` per auth method
- `fixtures/` — static data only (including `seed-config.json`)
- `schema/` — Zod schemas
- All endpoints live in `shared/endpoints.ts`

---

## Step 5 — Verify

Agent runs:

- `yarn tsc` — must pass
- `yarn test:api` — on dev by default
- Reports results back

---

## What you provide vs what the agent does

| Task                             | Who             |
| -------------------------------- | --------------- |
| Share Bruno path                 | You             |
| Write short requirement file     | You (~10 lines) |
| Extract endpoints from Bruno     | Agent           |
| Derive Zod schemas from examples | Agent           |
| Generate test cases              | Agent           |
| Review test cases                | You             |
| Write Playwright code            | Agent           |
| Write helpers / fixtures         | Agent           |
| Run `yarn tsc` + tests           | Agent           |
| Triage failures                  | Both            |

---

## Seed Profiles

Different auth methods need different seed data. Instead of one generic seed helper, each auth method has its own **`SeedProfile`** under `api/helpers/profiles/`.

A profile declares:

- Which company to use (resolved from `seed-config.json` per env)
- Which identifier field + strategy (`generated` | `fixed` | `pool`)
- How to create the employee
- Ordered cleanup steps (run post-test AND as forced pre-seed cleanup for idempotency)
- Parallelism (`safe` | `must-be-serial`)

### Test file usage

```ts
import {
  seedFromProfile,
  cleanupFromProfile,
  SeedContext,
} from '../../helpers/seed'
import { phoneSignupProfile } from '../../helpers/profiles/phone'

test.describe('Signup by Phone', () => {
  let ctx: SeedContext

  test.beforeEach(async ({ request }) => {
    ctx = await seedFromProfile(request, phoneSignupProfile)
  })

  test.afterEach(async ({ request }) => {
    await cleanupFromProfile(request, phoneSignupProfile, ctx)
  })

  test('happy path', async ({ request }) => {
    const phone = ctx.identifiers.phone!
    // ...
  })
})
```

### Adding a new profile

1. **Fill in `shared/fixtures/seed-config.json`** with the company ID for the new method on dev/staging (and any fixed identifier values).
2. **Create `api/helpers/profiles/<method>.ts`** implementing `SeedProfile`.
3. **Write the test** using `seedFromProfile(request, <method>SignupProfile)`.
4. **If the profile uses a fixed identifier**, add `test.describe.configure({ mode: 'serial' })` to the test file.

### Cleanup behavior

- **Post-test** (`afterEach`): runs all cleanup steps, best-effort — errors are logged as warnings but never throw.
- **Pre-seed** (`beforeEach`): the same cleanup steps also run before creating the employee, making tests idempotent across partial-failure reruns. Cleanup steps must tolerate "not found" responses (the `employee.ts` helpers already do — 404 is ignored).

---

## Tips

- **Start minimal.** One happy path test is a better starting point than 20 edge cases.
- **Review test cases before code.** Changing a Markdown bullet is free; regenerating code is not.
- **Use the Bruno collection as the source of truth.** Do not hand-copy endpoints or payloads into requirement files.
- **Reuse profiles and helpers.** If a seed profile already exists for the auth method, reuse it. Do not duplicate.
- **Endpoints go in one place.** Always `shared/endpoints.ts`. If the agent tries to hardcode a string, push back.
- **Seed config goes in one place.** Always `shared/fixtures/seed-config.json`. Never commit secrets to this file (only IDs and identifier values).

---

## Example request

> Write API tests for signup by LINE.
>
> - Bruno: `/Users/admin/Workspace/api-collection/opencollection/🧙🏻‍♂️ QA - Dual Write Database (Tao)/🟢 [E2E] Signup/🟠 By Line/`
> - Requirement: `requirements/signup-line.md`
> - Reuse `createEmployee` / `deleteEmployee` from `api/helpers/employee.ts`
> - Start with happy path only

That is enough.
