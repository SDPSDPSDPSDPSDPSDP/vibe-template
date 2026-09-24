---
name: db-audit
description: Audit every database query and its related code for inefficiency. Use when the user says "audit the queries", "db audit", or /db-audit. Report only, no fixes.
---

# DB Audit

Look at all the database queries and the related code, and do a complete audit of what is not as efficient as it could be. Check the live schema and indexes too, not just the code. Report findings ranked by impact, with `file:line` and a suggested fix. Do not apply changes.
