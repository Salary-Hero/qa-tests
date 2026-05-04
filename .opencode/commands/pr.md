---
description: Write a pull request description for the current branch
agent: qa-pr-writer
subtask: true
---

Write a pull request title and description for the current branch.

Read the git history, changed files, and test coverage data — then produce:

1. A PR title — imperative mood, max 72 characters, derived from the branch name and commit history.
2. A PR body that is clear to both engineers and non-technical readers.

Save the draft to `.opencode/plans/pr/<branch-name>.md` with the title as the very first line in the format `# PR Title: <title>`, followed by the body.

Print the title and the file path to the user when done.

Do not run `gh pr create`. Do not commit anything. Draft only.
