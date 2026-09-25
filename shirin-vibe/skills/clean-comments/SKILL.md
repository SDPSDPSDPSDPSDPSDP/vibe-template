---
name: clean-comments
description: Strip or collapse stale/obvious comments in the current branch's changed files. Mechanical, no design judgment - suits a cheap/small model. Use when the user says "clean comments" or /clean-comments. Also run by branch-cleanup.
---

# Clean Comments

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

Find every comment - single-line `//` and multi-line `/* */` blocks. Grep both patterns, don't rely on single-line regex alone.

For each:
- Comment explains WHAT code does -> prefer splitting code into simpler, well-named functions so it's self-explanatory. Remove comment entirely.
- Comment explains WHY (non-obvious reasoning, tradeoff, constraint) -> keep, collapse to single line, state only the why, 1 sentence max.

No behavioral changes. Do not touch code logic beyond splitting for a removed WHAT-comment.

Scope is where to look first, not a limit. Fix issues found outside scope or pre-existing issues too.

## Report

Terse. One line per comment. No prose.

```
file:line - removed: what-comment.
file:line - collapsed: why-comment.
file:line - kept: reason.
```
