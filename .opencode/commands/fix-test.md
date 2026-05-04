---
description: Review a test file and fix all violations against project coding standards
skill: qa-engineering-lead
---

# /fix-test — Review and fix a test file

Review and fix all standards violations in the file at `$ARGUMENTS`.

---

## Step 1 — Review

Check every rule from `.opencode/AGENTS.md` in this order:

1. Security — credentials, env var handling
2. DB query placement — no `query()` in `.test.ts`
3. Auth — `getAdminToken()` only, no `loginAsAdmin()`
4. Company IDs — `getCompany()` only, no hardcoded numbers
5. OTP / PINCODE — from `shared/utils/seed-config.ts` only
6. TypeScript — no `any`, no `as any`, correct interfaces
7. `test.step()` — present in all lifecycle hooks and test bodies
8. Schema completeness — all asserted fields declared in Zod schema
9. Response validation — `parseResponse()` used, no manual status check + cast
10. Identifier generation — `resolvePhone()` not `generatePhone()`, from `api/helpers/identifiers.ts`
11. Cleanup — `hardDeleteEmployee()` in `afterEach` with `userIdsToClean` array
12. Imports — no unused imports, no dead exports
13. File naming — `.test.ts` extension
14. Test naming — `[Type] – [Feature] – [Scenario] – [Expected Result]`
15. Mandatory tags — all four tag groups present on every `test()` call

Collect all violations before making any changes.

---

## Step 2 — Report planned fixes

Print a list of every violation found:

```
[SEVERITY] file:line — rule violated — fix to apply
```

Then print:

```
--- Applying fixes above ---
```

Do not wait for confirmation — proceed immediately to Step 3.

---

## Step 3 — Apply fixes

Fix every violation found in Step 1 in the target file.

For violations that require changes outside the test file (e.g. a missing Zod schema field, a missing endpoint in `shared/endpoints.ts`, a missing DB helper in `shared/db-helpers.ts`), apply those changes too and include the affected files in the Step 4 summary.

---

## Step 4 — Run `yarn tsc`

Run `yarn tsc` and fix all type errors before finishing.

Print a summary:

```
Fixed N violations in <file>
  [HIGH]   file:line — description of fix
  [MEDIUM] file:line — description of fix
  ...

Other files modified:
  shared/endpoints.ts — <reason>
  ...

yarn tsc — 0 errors
```

If `yarn tsc` still has errors after fixes, list them and stop — do not attempt silent workarounds.
