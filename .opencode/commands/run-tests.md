---
description: Run the full API test suite and interpret results
---

Run `npm run test:api` and interpret the results.

After the run:
1. Show the pass/fail summary (total, passed, failed, skipped)
2. For each failing test: show the test name, error message, and likely root cause
3. Group failures by category:
   - Infrastructure (API unreachable, DB connection, missing env var)
   - Data state (leftover test data, import worker timing)
   - Code bug (assertion mismatch, wrong payload)
   - Type error (run `npm run tsc` to check)
4. Suggest the fix for each category

If all tests pass, confirm the count and note any skipped tests.
