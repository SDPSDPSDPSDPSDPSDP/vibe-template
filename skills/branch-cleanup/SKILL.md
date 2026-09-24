---
name: branch-cleanup
description: Clean up the current branch's changed files before merge - simplify, strip stale comments, dedupe, audit file size. Use when the user says "clean this branch", "branch cleanup", or /branch-cleanup.
---

# Branch Cleanup

Clean this branch before merge. Orchestrator - runs the checks below against changed files.

## Scope

Get changed files vs main:

```
git diff main...HEAD --name-only
```

Only touch these files. Nothing outside scope.

## Checks

Run each in order. Apply only justified changes - skip a check if nothing in scope qualifies. If your tool supports subagents, delegate each check to one, passing it the in-scope file list - keeps each check's file-reading out of your own context.

1. `checks/simplify-code.md`
2. `checks/clean-comments.md` - mechanical, use a cheap/small model if your tool supports it
3. `checks/detect-duplication.md`
4. `checks/review-file-size.md`

## After changes

1. Run typecheck/lint for the project (see project's own docs/AGENTS.md for exact commands).
2. Review the resulting diff yourself.
3. Report what changed and what was skipped.

## Report

Terse. One line per item, grouped by file. No prose, no praise.

```
file:line - changed: what. why.
file:line - skipped: what. why.
```
