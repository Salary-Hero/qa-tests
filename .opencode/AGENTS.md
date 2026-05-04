# QA Tests — Agent Rules

Full coding standards and rationale live in `.opencode/AGENTS.md` and `.opencode/skills/qa-engineering-lead/SKILL.md`.

Load the skill at the start of every coding session in this repo:

```
.opencode/skills/qa-engineering-lead/SKILL.md
```

---

## Quick Reference

### Never do this
- Call `query()` outside `shared/db-helpers.ts`
- Write `DROP`, `TRUNCATE`, `ALTER TABLE`, or any DDL SQL — ever
- Write `DELETE` or `UPDATE` without a `WHERE` clause scoped to specific IDs
- Write SQL targeting a table not in the known list (`users`, `employment`, `user_identity`, `user_balance`, `user_bank`, `user_provider`, `employee_profile`, `employee_profile_audit`, `company_user_sites`)
- Touch the DB if `ENV` is not `'dev'` or `'staging'` — stop and ask first
- Read `process.env` outside `shared/utils/env.ts`
- Hardcode company IDs — use `getCompany('name')`
- Use `getAdminToken()` from anywhere except `api/helpers/admin-console-auth.ts`
- Call `generatePhone()` directly — always use `resolvePhone()`
- Use file extension `.spec.ts` — always `.test.ts`
- Add `any` types or `as any` casts
- Create `.env.dev` or `.env.staging` — one `.env` file, `_DEV`/`_STAGING` key suffixes
- Commit, push, or create PRs unless explicitly asked

### Always do this
- Wrap every action in `test()` / `beforeAll()` / `afterEach()` etc. with `test.step()`
- Run `yarn tsc` after every change — zero errors required
- Put cleanup functions that touch the DB in `shared/db-helpers.ts`
- Use `hardDeleteEmployee()` for teardown — never rely on soft delete
- Validate every API response with `parseResponse()` from `shared/utils/response.ts`
- Follow test naming: `[Type] – [Feature] – [Scenario] – [Expected Result]`
- Include all four mandatory tags: `@component/@workflow`, `@high/@medium/@low`, `@smoke/@regression`, `@guardian/@avengers/@shared`

### Where things go
| Need | File |
|---|---|
| DB query | `shared/db-helpers.ts` |
| Env vars / credentials | `shared/utils/env.ts` |
| Company IDs, OTP, PINCODE | `shared/utils/seed-config.ts` |
| API endpoint URLs | `shared/endpoints.ts` |
| Random identifiers | `api/helpers/identifiers.ts` |
| Zod response schemas | `api/schema/{feature}.schema.ts` |
| Seed/cleanup profiles | `api/helpers/profiles/{auth-method}.ts` |
| Reusable API call sequences | `api/helpers/{feature}-flow.ts` |

### Plans and notes
- Personal docs → `.opencode/plans/` (gitignored)
- Requirements docs → `.opencode/requirements/<feature>/`
- Never create `.md` files at project root or in `docs/` unless explicitly asked
