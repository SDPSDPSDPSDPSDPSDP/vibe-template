---
name: detect-duplication
description: Finds and consolidates genuinely duplicated logic in a given set of changed files. Design judgment required - must tell real duplication from superficially similar code. Given a file list, does not decide scope itself.
---

# Detect Duplication

Find genuinely duplicated logic in files in scope. Consolidate only when it makes the code simpler. Don't create generic abstractions for two superficially similar snippets - two similar-looking blocks are not automatically duplication.

Apply only to files in scope. Only justified changes.

## Report

Terse. One line per item. No prose.

```
file:line - consolidated: what, into where.
file:line - skipped: looks similar, not duplication. why.
```
