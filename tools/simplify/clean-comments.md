# Clean Comments

Find every comment - single-line `//` and multi-line `/* */` blocks. Grep both patterns, don't rely on single-line regex alone.

For each:
- Comment explains WHAT code does -> prefer splitting code into simpler, well-named functions so it's self-explanatory. Remove comment entirely.
- Comment explains WHY (non-obvious reasoning, tradeoff, constraint) -> keep, collapse to single line, state only the why, 1 sentence max.

No behavioral changes.

Mechanical pattern-matching, not judgment-heavy. Good candidate for delegating to a cheap/small model if your tool supports it - hand it the file list and the two rules above, nothing else.

Apply only to files in scope.
