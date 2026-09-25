---
name: detect-duplication
description: Find and consolidate genuinely duplicated logic in the current branch's changed files. Use when the user says "detect duplication", "dedupe", or /detect-duplication. Also run by branch-cleanup.
---

# Detect Duplication

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

Find genuinely duplicated logic in files in scope. Consolidate only when it makes the code simpler. Don't create generic abstractions for two superficially similar snippets - two similar-looking blocks are not automatically duplication.

Scope is where to look first, not a limit. Fix issues found outside scope or pre-existing issues too. Only justified changes.

## Report

Terse. One line per item. No prose.

```
file:line - consolidated: what, into where.
file:line - skipped: looks similar, not duplication. why.
```
