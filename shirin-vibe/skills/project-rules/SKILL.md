---
name: project-rules
description: Check the current branch's changed files against the project's own hard rules (AGENTS.md / CLAUDE.md) and fix violations. Use when the user says "check project rules", "rules audit", or /project-rules. Also run by branch-cleanup and codebase-cleanup.
---

# Project Rules

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

1. Read the project's hard rules from `AGENTS.md` and `CLAUDE.md` (and files they import with `@`). No rules file -> report that and stop.
2. Run ESLint on files in scope. Rules the project already encodes in ESLint are checked there, not by reading:

```
npx eslint --format compact <files in scope>
```

3. Check every remaining rule ESLint can't see by reading and grepping files in scope. Typical gaps:
   - Silent fallbacks ESLint misses: `catch` blocks that swallow errors or return `null`/defaults, `?.` chains hiding a value that must exist.
   - Raw values in CSS files outside token definitions: hex colors, `px`, solid grey text colors.
   - Business logic or data models inside dumb UI primitives.
   - Routes/handlers without rich server logs.
   - Emojis, em dashes, comments explaining WHAT.
4. Fix each violation. When a rule is ambiguous for a case, skip it and report.

## Report

Terse. One line per item. No prose.

```
file:line - fixed: rule. what changed.
file:line - skipped: rule. why.
```
