---
name: review-file-size
description: Split the current branch's changed files over 200 LOC (target 100-200) along real responsibility boundaries. Use when the user says "review file size" or /review-file-size. Also run by branch-cleanup.
---

# Review File Size

## Scope

If given a file list (e.g. by branch-cleanup), use it. Otherwise get changed files vs main:

```
git diff main...HEAD --name-only
```

## Steps

Target: code files of 100-200 LOC. Over 200 LOC is always too much - that file must be split, no exceptions for "it's still readable".

Get oversized and over-nested files from ESLint (`max-lines`, `max-depth`, `complexity` rules in the project config), not by counting:

```
npx eslint --format compact <files in scope>
```

No ESLint in project -> use `wc -l`, same 200 LOC limit.

For each flagged file: split it. The number decides WHETHER to split; responsibilities decide WHERE. Cut along real boundaries (separate concerns, sub-components, helpers, types) - never mid-function or into arbitrary part1/part2 files.

Only exceptions: generated code, data/constant tables, test fixtures. Report them as kept.

Scope is where to look first, not a limit. Fix issues found outside scope or pre-existing issues too.

## Report

Terse. One line per file. No prose.

```
file - split into: new files. why.
file - kept at N LOC. exception: generated/data/fixture.
```
