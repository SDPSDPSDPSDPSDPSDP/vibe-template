# Database & Supabase Guide

> Database configuration, connection details, and migration rules.

---

## 1. Project Environment & Supabase Config

* **Supabase Project Ref:** `<project-ref>`
* **Region:** `<region>` (e.g., `eu-west-1`)
* **Supabase URL:** `https://<project-ref>.supabase.co`
* **Target Schema:** `<schema-name>` (all app tables live under this schema, not `public`)

---

## 2. Tooling & Migration Rules

* **Apply Migrations:** Use the Supabase MCP tool (`apply_migration`) for all schema changes. Never create hand-written SQL migration files in the repository.
* **Reference Schema Snapshot:** Any `supabase/schema.sql` file serves strictly as a read-only reference snapshot for inspecting full schema structure or bootstrapping new instances.
* **Verify Writes:** Always verify schema changes with a real DML write operation (`INSERT`/`UPDATE`). `SECURITY DEFINER` RPCs and views can read stale columns but fail on writes.
* **Avoid RPC Overload Footguns:** Avoid parameter default values (`DEFAULT NULL`) that produce ambiguous function signatures in Postgres (`error 42725`). Drop stale overloads explicitly.

---

## 3. Architecture & Query Patterns

* **Single-User Apps:** Shared private Supabase project. Custom schema gated by a single-user RLS check.
* **Multi-User Apps:** Shared public Supabase project. Distinct schema with `auth.uid() = user_id` or RPC bridges in `public`.
* **1000-Row REST Truncation:** PostgREST silently caps `SELECT` queries at 1000 rows without throwing an error. Always paginate queries using `.range()` + `.order()`.
* **Exact Row Counts:** Use `{ count: "exact", head: true }` for total counts instead of fetching rows client-side.
* **RLS & Security Audit:** See [docs/supabase-security-audit.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/supabase-security-audit.md) and [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md).
