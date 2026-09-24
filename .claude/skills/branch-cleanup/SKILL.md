---
name: branch-cleanup
description: Clean up the current branch's changed files before merge - simplify, strip stale comments, dedupe, audit file size. Use when the user says "clean this branch", "branch cleanup", or /branch-cleanup.
---

Read `tools/branch-cleanup.md` at the repo root for the canonical scope step (`git diff main...HEAD --name-only`) and check order. Do not run the 4 checks yourself - each has a matching subagent, dispatch to it instead, passing the in-scope file list:

1. `subagent_type: simplify-code`
2. `subagent_type: comment-cleaner` (small model - mechanical pattern-matching)
3. `subagent_type: detect-duplication`
4. `subagent_type: review-file-size`

Each subagent's own file (`.claude/agents/<name>.md`) already contains its rules - do not duplicate them here. Dispatching keeps each check's file-reading and back-and-forth out of your own context; you only receive its final report.

After all 4 report back: run typecheck/lint for the project, review the resulting diff yourself, and report what changed file by file plus what was skipped and why.
