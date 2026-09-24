---
name: review-file-size
description: Audits a given set of changed files for excessive length and splits where it has genuinely separate responsibilities. Design judgment required - must find real module boundaries, not just a line-count cutoff. Given a file list, does not decide scope itself.
---

# Review File Size

Prefer no code file over 100-200 LOC. More than that is too much.

For each file in scope exceeding this: audit, split where it makes sense and is possible. Don't split just to hit a number - split only where the file has accumulated genuinely separate responsibilities.

Apply only to files in scope.

Report what you split per file, into what new files, and what you left alone despite length, with reason.
