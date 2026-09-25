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

Run each skill in order, passing it the in-scope file list. Apply only justified changes - skip a check if nothing in scope qualifies.

**Strictly sequential. Never run checks in parallel.** One check at a time. Wait for it to finish fully before starting the next - each check edits files the next one reads. If your tool supports subagents, delegate each skill to one - keeps each check's file-reading out of your own context - but spawn only one subagent at a time and wait for its result (never background it, never launch two in the same turn).

1. `simplify-code`
2. `clean-comments` - mechanical, use a cheap/small model if your tool supports it
3. `detect-duplication`
4. `review-file-size`

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
