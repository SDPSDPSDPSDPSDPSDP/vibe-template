---
name: simplify-code
description: Simplifies a given set of changed files - removes unrequested abstractions, over-engineering, unneeded nesting. Design judgment required. Given a file list, does not decide scope itself.
---

# Simplify Code

Simplify, no duplication, SOLID, clean code. Nested folder structure and small files. Limited nesting in code itself. Be careful of over-engineering.

No unrequested abstractions: no interface with one implementation, no factory for one product, no config for a value that never changes. No speculative flexibility for hypothetical future requirements.

Apply only to files in scope. Only justified changes.

## Report

Terse. One line per item. No prose.

```
file:line - changed: what. why.
file:line - skipped: what. why.
```
