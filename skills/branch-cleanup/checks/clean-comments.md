---
name: clean-comments
description: Strips or collapses stale/obvious comments in a given set of files. Mechanical pattern-matching only, no design judgment - suits a cheap/small model. Given a file list, does not decide scope itself.
---

# Clean Comments

Find every comment - single-line `//` and multi-line `/* */` blocks. Grep both patterns, don't rely on single-line regex alone.

For each:
- Comment explains WHAT code does -> prefer splitting code into simpler, well-named functions so it's self-explanatory. Remove comment entirely.
- Comment explains WHY (non-obvious reasoning, tradeoff, constraint) -> keep, collapse to single line, state only the why, 1 sentence max.

No behavioral changes. Do not touch code logic beyond splitting for a removed WHAT-comment.

Apply only to files in scope.

Report which comments you removed, collapsed, or kept, per file.
