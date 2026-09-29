---
name: db-audit
description: Audit every database query and its related code for inefficiency. Use when the user says "audit the queries", "db audit", or /db-audit. Report only, no fixes.
context: fork
agent: shirin-vibe:auditor
background: false
---

# DB Audit

Look at all the database queries and the related code, and do a complete audit of what is not as efficient as it could be. Use the Supabase MCP when available to check the live schema and indexes.

## Report

Terse. One line per finding, ranked by impact. No prose, no praise.

```
file:line - problem. fix.
```
