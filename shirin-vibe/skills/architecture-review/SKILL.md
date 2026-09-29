---
name: architecture-review
description: Expert review of the whole codebase's architecture. Use when the user says "review the architecture", "architecture review", or /architecture-review. Report only, no fixes.
context: fork
agent: shirin-vibe:auditor
background: false
---

# Architecture Review

Review the architecture of this codebase like an expert, including the database architecture. Use the Supabase MCP when available to check the live schema.

## Report

Terse. One line per finding, ranked by impact. No prose, no praise.

```
file:line - problem. fix.
```
