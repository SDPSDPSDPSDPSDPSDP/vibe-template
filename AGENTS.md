# AGENTS.md

> Mandatory instructions and operational guardrails for AI coding assistants working in this repository.

---

## 1. Repository Overview & Stack

This project is built on the **Vibe Template** stack:
* **Database & Auth:** Supabase (Postgres + Auth)
* **File Storage:** Cloudflare R2 (Private bucket via presigned URLs)
* **Hosting & API:** Vercel (Next.js serverless architecture)

---

## 2. Documentation Sitemap

Before modifying code or designing features, consult the core documentation:

* 📐 **System Architecture:** [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md) — Infra design, R2 storage flow, RLS security patterns, and Vercel route dispatcher architecture.
* 🎨 **Coding Standards:** [docs/CODING-STANDARDS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md) — CSS design tokens, folder structure, domain logic modules, and UI skeleton loading rules.
* 🚀 **Bootstrap & Setup Guide:** [docs/AI-startup-guide.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/AI-startup-guide.md) — Temporary onboarding checklist for scaffolding a new project.

---

## 3. Hard Operational Rules (Never Violate)

### 🚨 Builds & Dev Server
* **NEVER run `next build` while `next dev` is running.** Running both simultaneously corrupts the `.next` directory.
* Use `tsc --noEmit` to verify TypeScript types and compilation errors safely.

### 🧪 Browser & UI Testing
* **Playwright and headless browser automation do NOT work in this environment.**
* Do not attempt browser automated testing; prompt the user to inspect UI changes directly in their browser.

### ✍️ Code Comments
* **Keep comments to an absolute minimum.**
* Never write comments explaining *what* code does — the code itself must be clear and self-describing.
* Only add a comment if explaining non-obvious *why* rationale or external constraints.

### 🎨 Design Tokens & CSS
* **NEVER hardcode raw visual values** (hex colors, pixel font sizes, arbitrary padding/margins).
* All visual properties must reference design tokens from `src/styles/global/tokens.css` or `typography.css` via `var(--token)`.

### 🗄️ Database Migrations & Schemas
* **Apply schema changes ONLY via the Supabase MCP tool (`apply_migration`).** Never create hand-written SQL migration files in the repo.
* **Verify with a real write operation after schema changes.** Reads may succeed on renamed columns or outdated `SECURITY DEFINER` RPCs while writes fail silently.
* **Avoid RPC Overload Footguns:** Avoid optional parameters (`DEFAULT NULL`) that create ambiguous function signatures in Postgres (`error 42725`).
