# Branch Cleanup

Clean this branch before merge. Orchestrator - runs the checks below against changed files. Works with any AI coding tool (Claude, Gemini, Codex, Cursor, ...).

## Scope

Get changed files vs main:

```
git diff main...HEAD --name-only
```

Only touch these files. Nothing outside scope.

## Checks

Run each in order. Apply only justified changes - skip a check if nothing in scope qualifies.

1. `simplify/simplify-code.md`
2. `simplify/clean-comments.md` - mechanical, delegate to a cheap/small model if your tool supports it
3. `simplify/detect-duplication.md`
4. `simplify/review-file-size.md`

## After changes

1. Run typecheck/lint for the project (see project's own docs/AGENTS.md for exact commands).
2. Review the resulting diff yourself.
3. Report what changed, file by file, and what was skipped and why.
