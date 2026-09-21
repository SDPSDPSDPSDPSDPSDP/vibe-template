# AGENTS.md

> Mandatory instructions and operational guardrails for AI coding assistants working in this repository.

---

## 1. Repository Overview & Stack

This project is built on the **Vibe Template** stack architecture:
* **Database & Auth:** Supabase (Postgres + Auth)
* **File Storage:** Cloudflare R2 (Private bucket via presigned URLs)
* **Hosting & API:** Vercel (Next.js serverless architecture) or Python backend services

---

## 2. Project Environment & Supabase Config

* **Supabase Project Ref:** `<project-ref>`
* **Region:** `<region>` (e.g., `eu-west-1`)
* **Supabase URL:** `https://<project-ref>.supabase.co`
* **Target Schema:** `<schema-name>` (all app tables live under this schema, not `public`)

> **Tooling Note:** Use the Supabase MCP tool for all database changes (schema migrations via `apply_migration`, inspecting types, running SQL queries).

---

## 3. Documentation Sitemap

Before modifying code or designing features, consult the core documentation:

* **System Architecture:** [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md) - Infra design, R2 storage flow, RLS security patterns, and Vercel route dispatcher architecture.
* **Coding Standards:** [docs/CODING-STANDARDS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md) - CSS design tokens, folder structure, domain logic modules, and UI skeleton loading rules.
* **Security Audit Playbook:** [docs/supabase-security-audit.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/supabase-security-audit.md) - Checklist and prompt template for auditing and hardening Supabase RLS.
* **Bootstrap & Setup Guide:** [AI-startup-guide.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/AI-startup-guide.md) - Portable onboarding checklist and stack profile selection guide for scaffolding a new project.

---

## 4. Coding Philosophy

* Apply the `ponytail:ponytail` skill (YAGNI-first, minimal-diff coding) to all code changes in this repo.

---

## 5. Hard Operational Rules (Never Violate)

### Emojis & Em Dashes
* **NEVER use emojis or em dashes in code comments, markdown docs, or commit messages.**
* Do not use any emojis or em dashes (`-`). Use plain hyphens (-) or standard text formatting instead.

### Builds & Dev Server
* **NEVER run `next build` while `next dev` is running.** Running both simultaneously corrupts the `.next` directory.
* Use `tsc --noEmit` to verify TypeScript types and compilation errors safely. For Python components, use `mypy` or `ruff` for static verification.

### Browser & UI Testing
* **Playwright and headless browser automation do NOT work in this environment.**
* Do not attempt browser automated testing; prompt the user to inspect UI changes directly in their browser.

### Code Comments
* **Keep comments to an absolute minimum.**
* Never write comments explaining *what* code does - the code itself must be clear and self-describing.
* Only add a comment if explaining non-obvious *why* rationale or external constraints.

### Component Architecture (UI vs Domain)
* **`src/components/ui/`:** Place domain-agnostic UI building blocks here. They must be controlled purely via generic props and never import business logic, app data models, or database schemas.
* **`src/components/domain/`:** Place feature and business-aware components here. Feature components compose generic building blocks from `src/components/ui/`.

### Design Tokens & CSS
* **NEVER hardcode raw visual values** (hex colors, pixel font sizes, arbitrary padding/margins).
* All visual properties must reference design tokens from `src/styles/global/colors.css`, `tokens.css`, or `typography.css` via `var(--token)`.
* **No Hardcoded Grey Text:** Text colors must never use solid hex greys - always use alpha transparent white or black tokens (e.g. `rgba(255, 255, 255, 0.96)`, `rgba(255, 255, 255, 0.5)`) for proper blending on dynamic surfaces.

### Error Handling & Fallbacks
* **NEVER implement silent fallbacks - always fail hard.** Swallowing exceptions or returning dummy fallback data (e.g. `[]` or `{}`) hides real database, permission, or code defects. Let errors throw explicitly. See [docs/CODING-STANDARDS.md#5-error-handling--fallbacks-policy](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md#5-error-handling--fallbacks-policy).
* **Strict Environment Variables:** Never use inline fallback defaults for environment variables (e.g. `process.env.KEY || 'default'`). Environment variables must either be explicitly set or throw/fail hard immediately.
* **Exception:** Only implement a fallback behavior when the user **explicitly asks** for it.

### Diagnostic Server Logging for AI Autonomy
* **Emit rich server-side logs on API routes and server handlers.** AI agents inspect server runtime logs directly (via Vercel/Supabase log tools) to debug failures autonomously. Log request parameters, validation failures, database errors, and full stack traces server-side so you never have to ask the user to manually inspect their browser DevTools. See [docs/CODING-STANDARDS.md#7-structured-diagnostics--server-side-logging](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md#7-structured-diagnostics--server-side-logging).

### Database Migrations & Schemas
* **Apply schema changes ONLY via the Supabase MCP tool (`apply_migration`).** Never create hand-written SQL migration files in the repo.
* **Reference Schema Files:** If a `supabase/schema.sql` file exists in the repo, treat it strictly as a read-only reference snapshot (useful for inspecting table structure at a glance or bootstrapping a new project). Never use it to run migrations.
* **Verify with a real write operation after schema changes.** Reads may succeed on renamed columns or outdated `SECURITY DEFINER` RPCs while writes fail silently.
* **Avoid RPC Overload Footguns:** Avoid optional parameters (`DEFAULT NULL`) that create ambiguous function signatures in Postgres (`error 42725`).

### External Projects & Repositories
* **Locating Referenced Projects:** If the user mentions other projects, inspect local paths under `C:\Users\shiri\Code\` or search GitHub via tools.
* **Known Projects:**
  * `C:\Users\shiri\Code\Gratitude\Gratitude` and its GitHub repository `SDPSDPSDPSDPSDPSDP/gratitude` (`https://github.com/SDPSDPSDPSDPSDPSDP/gratitude`)
  * `C:\Users\shiri\Code\Closet` and its GitHub repository `SDPSDPSDPSDPSDPSDP/closet` (`https://github.com/SDPSDPSDPSDPSDPSDP/closet`)

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
