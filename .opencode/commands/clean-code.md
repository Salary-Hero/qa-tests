---
description: Scan a file for code quality issues and fix them all
skill: qa-engineering-lead
---

Review `$ARGUMENTS` against all rules in `.opencode/AGENTS.md`, then immediately fix every issue found.

Fix order:
1. Security issues first (credentials, env var handling)
2. DB query placement (move `query()` calls to `shared/db-helpers.ts`)
3. Auth helpers (replace `loginAsAdmin()` with `getAdminToken()`)
4. Hardcoded company IDs (replace with `getCompany()`)
5. TypeScript issues (`any` types, `as any` casts)
6. Missing `test.step()` wrappers
7. Schema gaps (add missing `.optional()` fields)
8. Dead imports and unused exports
9. Identifier generation location
10. File rename if `.spec.ts`

After all fixes, run `npm run tsc` to confirm zero type errors.
Report what was changed and the final tsc result.
