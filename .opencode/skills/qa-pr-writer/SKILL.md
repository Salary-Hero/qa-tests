# Skill: qa-pr-writer

## Purpose

Write a pull request description based on code changes in the current branch.
The output must be clear to both engineers and non-technical readers (product, QA managers, stakeholders).

---

## Tone Rules

- **Plain English first.** "What changed" and "Why" must be understandable without knowing the codebase.
- **No jargon** in the first two sections. Terms like "Zod schema", "Playwright", "beforeAll" belong only in the "How to review" section, if at all.
- **Concise.** Target ~300 words total. Cut anything that doesn't help the reader decide whether to approve.
- **Active voice.** "This PR adds..." not "Tests have been added..."
- **No bullet soup.** Prefer short sentences over long nested bullet lists.
- **No emojis.**

---

## PR Template

Use exactly this structure. Do not add extra sections.

```markdown
## What changed

[1–3 sentences. What does this branch do, in plain English?
Focus on the outcome, not the implementation. A non-technical reader should understand this.]

## Why

[1–2 sentences. What problem does this solve, or what risk does it reduce?
If this was a gap before, say so.]

## Test coverage

| Feature | Tests | What it verifies | Status |
|---------|-------|-----------------|--------|
| ...     | N     | ...             | ✅ Pass |

**Total: N/N passing.**

[One sentence summarising what the tests confirm end-to-end, in plain English.]

## How to review

- Run: `npm run test:api`
- Type check: `npm run tsc`
- Key files:
  - `path/to/file` — [one phrase: what it does]
  - ...

## Notes

[Optional. Known gaps, deprecated patterns left intentionally, follow-up items.
If nothing to add, omit this section entirely.]
```

---

## Data Sources

Pull facts from these sources in order:

1. `git log main..HEAD --oneline` — list of commits; use to summarise scope
2. `git diff main...HEAD --stat` — changed files; use to identify key files for "How to review"
3. `.opencode/requirements/COVERAGE_MATRIX.md` — authoritative test count and pass status for the coverage table
4. `.opencode/requirements/<feature>/README.md` for any feature directory touched in the diff — use for "What changed" and "Why" context

Do not invent test counts. Use only what COVERAGE_MATRIX.md states.

---

## Coverage Table Rules

- One row per feature group (Employee CRUD, Signup: Phone, etc.) — not one row per test case.
- "What it verifies" column: one short phrase per row, plain English. Examples:
  - "create, read, update, delete employee records via API"
  - "employee signs up using phone number and OTP"
  - "HR imports employees and consent status is tracked correctly"
- Pull pass/fail status from COVERAGE_MATRIX.md. Use ✅ Pass or ❌ Fail.
- Add a bold "Total: N/N passing." line below the table.

---

## Key Files Selection

For "How to review", list only the files a reviewer actually needs to open — typically:
- The test files (`.test.ts`)
- The main helper files that contain the logic
- Schema files if they define the API contract

Skip: lock files, config files that didn't change meaningfully, fixture binaries.

---

## Output

Write the PR body to `.opencode/plans/pr/<branch-name>.md`.
Use the exact branch name as the filename (e.g. `e2e-api-tests.md`).
After writing, print the file path so the user can open it.
