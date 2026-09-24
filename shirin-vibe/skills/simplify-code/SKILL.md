---
name: simplify-code
description: Simplify the current branch's changed files - remove unrequested abstractions, over-engineering, unneeded nesting. Use when the user says "simplify code" or /simplify-code. Also run by branch-cleanup.
---

# Simplify Code

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

Simplify, no duplication, SOLID, clean code. Nested folder structure and small files. Limited nesting in code itself. Be careful of over-engineering.

No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes. No speculative flexibility for hypothetical future requirements.

Apply only to files in scope. Only justified changes.

## Report

Terse. One line per item. No prose.

```
file:line - changed: what. why.
file:line - skipped: what. why.
```
