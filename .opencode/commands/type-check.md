---
description: Run TypeScript type check and fix all errors
agent: build
subtask: true
---

Run `npm run tsc` and fix every error.

Process:
1. Run `npm run tsc` and capture all output
2. Group errors by file
3. Fix each error — use typed interfaces, `Partial<T>` for PATCH payloads, never `any`
4. Re-run `npm run tsc` after fixes
5. Repeat until zero errors

Report: files changed, error count before and after.
