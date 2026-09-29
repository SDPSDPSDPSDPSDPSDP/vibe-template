The description in marketplace.json is stale: no mention of cleanup or comments.
review-file-size: 100-200 LOC is an arbitrary number. It also contradicts "don't split to hit a number". Let max-lines flag files and cohesion decide the split. here i like that 100-200 is a guideline, because these are truly too much anything over that, so make that clearer!
Report-only skills: turn them into plugin agents (agents/*.md) with tools: Read, Grep, Glob. Then "no changes" is guaranteed by the tool list, not by a request in the prompt. yes do this

"Review the resulting diff yourself": a model reviewing its own changes misses its own mistakes. Hand the diff to a fresh subagent or /code-review instead.
where is this said?

ponytail-review, shouldnt be mentioned anywhere