---
name: review-file-size
description: Audit the current branch's changed files for excessive length and split along real responsibility boundaries. Use when the user says "review file size" or /review-file-size. Also run by branch-cleanup.
---

# Review File Size

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

Prefer no code file over 100-200 LOC. More than that is too much.

For each file in scope exceeding this: audit, split where it makes sense and is possible. Don't split just to hit a number - split only where the file has accumulated genuinely separate responsibilities.

Apply only to files in scope.

## Report

Terse. One line per file. No prose.

```
file - split into: new files. why.
file - kept at N LOC. why.
```
