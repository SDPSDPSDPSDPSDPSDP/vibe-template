# AGENTS.md

Hard rules for AI assistant. Obey always. Use caveman.

---

## Docs Index

Read docs before code, evaluate if needed to open depending on the user's request:
* [docs/CODING-STANDARDS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md) - Design tokens, folder structure.
* [docs/DATABASE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/DATABASE.md) - Supabase ref, schema, migrations.
* [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md) - R2 flow, RLS, Vercel routes.
---

## Hard Rules

* **Comments:** Minimal. Never explain what code does. Only non-obvious why.
* **No emojis / em dashes:** Plain hyphens (-) only.
* **Builds:** No `next build` while `next dev` runs. Corrupts `.next`. Typecheck: `tsc --noEmit`. Python: `mypy` or `ruff`.
* **Browser tests:** Playwright broken here. Ask user test in browser.
* **Components:**
  * `src/components/ui/`: Dumb primitives only. No business logic. No data models.
  * `src/components/domain/`: Smart feature components. Compose ui primitives.
* **Tokens & CSS:**
  * Never hardcode raw values (colors, pixels, padding). Use `var(--token)`.
  * Text color: alpha white/black only (`rgba(255,255,255,0.96)`). No solid hex greys.
* **Fail hard:** No silent fallbacks. No empty fallback arrays/objects. No env var fallbacks (`process.env.X || 'val'`). Throw error immediately.
* **Server logs:** Emit rich server logs (params, stack traces) on routes/handlers. AI debugs via logs.
* **DB changes:** Supabase MCP `apply_migration` only. No manual SQL files.
* **Other projects:** Find local code under `C:\Users\shiri\Code\` or search GitHub (`SDPSDPSDPSDPSDPSDP/gratitude`, `SDPSDPSDPSDPSDPSDP/closet`).

<!-- caveman-begin -->
Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.
<!-- caveman-end -->
