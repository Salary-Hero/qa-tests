---
description: Write a pull request description for the current branch
agent: qa-pr-writer
subtask: true
---

Write a pull request description for the current branch.

Follow all instructions in `.opencode/skills/qa-pr-writer/SKILL.md`.

Read the git history, changed files, and test coverage data — then produce a PR body that is clear to both engineers and non-technical readers.

Save the draft to `.opencode/plans/pr/<branch-name>.md` and print the file path when done.

Do not run `gh pr create`. Do not commit anything. Draft only.
