---
name: branch-cleanup
description: Clean up the current branch's changed files before merge - simplify, strip stale comments, dedupe, audit file size. Use when the user says "clean this branch", "branch cleanup", or /branch-cleanup.
---

Read and follow `tools/branch-cleanup.md` at the repo root. It orchestrates 4 checks, each its own file in `tools/simplify/`: `simplify-code.md`, `clean-comments.md`, `detect-duplication.md`, `review-file-size.md`. Those files are canonical, tool-agnostic instructions - do not duplicate their rules here, just execute them.

For `clean-comments.md` specifically: it is mechanical pattern-matching, not judgment-heavy. Delegate it to a cheap subagent to save tokens - spawn via the Agent tool with `model: "haiku"`, prompt containing only `tools/simplify/clean-comments.md` and the in-scope file list. Keep the other checks (simplify, duplication, file size) on the main thread since they need real judgment.
