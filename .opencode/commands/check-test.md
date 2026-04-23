---
description: Review a test file against project coding standards
agent: qa-code-reviewer
subtask: true
---

Review the file at `$ARGUMENTS` against all rules in `.opencode/AGENTS.md`.

Check every rule in this order:
1. Security — credentials, env var handling
2. DB query placement — no `query()` in `.test.ts`
3. Auth — `getAdminToken()` only, no `loginAsAdmin()`
4. Company IDs — `getCompany()` only, no hardcoded numbers
5. TypeScript — no `any`, no `as any`, correct interfaces
6. `test.step()` — present in all lifecycle hooks and test bodies
7. Schema completeness — all asserted fields declared in Zod schema
8. Imports — no unused imports, no dead exports
9. File naming — `.test.ts` extension
10. Identifier generation — from `api/helpers/identifiers.ts` only

Report each issue as: `[SEVERITY] file:line — rule violated — suggested fix`

Do not make any changes.
