# Technical System Architecture

> Objective architectural blueprint and infrastructure constraints for applications built with the Vibe Template.

---

## 1. Hosting & Infrastructure Blueprint

* **Database & Auth:** Supabase (Postgres + GoTrue Auth)
* **Object Storage:** Cloudflare R2 (Private bucket)
* **Web Hosting & API:** Vercel (Next.js serverless architecture)

---

## 2. Database & Supabase Strategy

### Multi-Project Audience Division
Projects are organized by **audience type** (one Supabase project per audience, with apps divided into schemas within that project):

1. **Single-User Apps:** Shared private Supabase project. Each app lives in its own schema and is gated by a single-user RLS check.
2. **Multi-User Apps:** Shared public Supabase project. Apps live in distinct schemas with row-level RLS (`auth.uid() = user_id`) or RPC bridges in `public`.

### Database Gotchas & Pagination Rules
* **1000-Row REST Truncation:** PostgREST silently caps `SELECT` queries at 1000 rows without throwing an error. Always paginate queries using `.range()` + `.order()`.
* **Exact Row Counts:** Use `{ count: "exact", head: true }` for total counts instead of fetching rows to count client-side.

### Migrations & RPC Operations
* **Single Source of Truth:** Schema migrations are managed directly in the database via `supabase_migrations.schema_migrations`. Use the Supabase MCP `apply_migration` tool instead of local SQL migration files.
* **Reference Schema Snapshot:** Any `supabase/schema.sql` file in the codebase serves strictly as a read-only reference snapshot for inspecting full schema structure or bootstrapping a new project instance. It is not used for applying migrations.
* **Schema Write Verification:** Test a real DML write operation (`INSERT`/`UPDATE`) after schema edits. `SECURITY DEFINER` RPCs with explicit column references will continue serving reads but fail on writes after column renames.
* **RPC Overloading Caution:** Parameter default values (`DEFAULT NULL`) cause Postgres function signature collisions (`42725: function is not unique`). Explicitly drop stale RPC overloads when modifying parameters.

---

## 3. Object Storage (Cloudflare R2)

### Egress & Storage Rationale
* **Zero Egress Fees:** Cloudflare R2 has zero egress fees. Supabase Storage free-tier cached egress (5 GB) is quickly exhausted by development deployments alone (each Vercel deploy cold-starts the CDN cache).
* **Storage Paths in Database:** Tables store object path strings (`storage_path`, `thumb_path`, `micro_path`, `video_thumb_path`), never binary bytes.

### Private Bucket Architecture
The R2 bucket is private (no public domain or public bucket URLs). Access is managed as follows:

* **Uploads (Presigned PUT URLs):** The browser requests a short-lived presigned PUT URL from `/api/storage/upload-url`. The browser uploads binary payloads directly to R2, avoiding serverless payload size limits.
* **Deletes:** Proxied through authenticated server API routes. Signed delete URLs are never exposed to the client.
* **Reads (302 Redirect to Signed URLs):** Server endpoints sign short-lived R2 read URLs and issue a `302 Redirect`. This offloads byte-streaming to R2, preventing Vercel CDN-to-Compute bandwidth charges.
* **CORS & Canvas Sampling:** Because signed-URL reads perform cross-origin redirects, R2 CORS must return `Access-Control-Allow-Origin` to allow `<canvas>` pixel sampling (`getImageData`).
* **Thumbnails:** Generated client-side prior to upload and saved alongside the original payload.
* **Image Rendering (`<img>` vs `next/image`):** Prefer standard HTML `<img>` tags for pre-thumbnailed R2 storage assets. `next/image` consumes transformation quotas and cannot follow 302 redirects to signed R2 URLs. Retain `next/image` only for bundled static assets.

### Cloudflare Worker Edge CDN & Cron Dispatcher (`worker/`)
The repository includes a Cloudflare Worker in `worker/`:
* **Edge Media CDN:** Binds directly to the R2 bucket (`env.BUCKET`) to serve media at edge speed with `immutable` caching, bypassing Vercel compute bandwidth charges.
* **Safari Video Scrubbing (HTTP Range Support):** Handles HTTP 206 `Range` requests required by iOS Safari for video streaming and scrubbing.
* **Free Hourly Cron Triggers:** Executes free hourly cron triggers (`0 * * * *`) that call `/api/cron/` endpoints on the Vercel app, bypassing Vercel Hobby plan single-daily-cron limitations.

---

## 4. Security & Row Level Security (RLS)

* **Database Gate vs. App Gate:** The Supabase publishable `anon` key is public by design. Application middleware (e.g. `src/proxy.ts`) protects pages, but RLS is the **only** gate protecting REST endpoints.
* **Authentication:** Standardize on Google OAuth (`auth.uid()`).
* **Fix Patterns:**
  * **Pattern A (Per-User Ownership):** `auth.uid() = user_id` for multi-user schemas.
  * **Pattern B (Single-User Gate):** `SECURITY DEFINER` helper function verifying `auth.uid() = '<authorized-uuid>'` when tables lack a `user_id` column.
* **Security Pitfalls:**
  * Revoke function privileges from `PUBLIC` as well as `anon`.
  * Reverse `ALTER DEFAULT PRIVILEGES` for `anon` on new schemas.
  * Add in-body `auth.uid()` checks inside `SECURITY DEFINER` RPCs.
* **Security Audit & Lockdown:** For step-by-step instructions and prompt templates for auditing RLS, grants, and storage bucket policies, follow [docs/supabase-security-audit.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/supabase-security-audit.md).

---

## 5. Deployment & Vercel Function Dispatcher

* **Region Co-Location (`dub1` / `eu-west-1`):** Vercel functions are pinned to Dublin (`dub1`) in `vercel.json` to match Supabase (`eu-west-1`). Sequential DB round-trips from default US regions (`iad1`) introduce transatlantic latency hops (causing multi-second delays on page loads). Functions must stay co-located with the Supabase region.
* **Hobby Plan Function Limit:** Vercel Hobby accounts limit deployments to **12 Serverless Functions**. The Hobby plan allows one region, configured via `"regions": ["dub1"]` in `vercel.json` (Dashboard settings in *Project Settings → Functions → Function Region* follow this file).
* **Dispatcher Pattern:** Consolidate small internal API endpoints into a single dispatcher function (`/api/editor.js`) mapping request parameters to internal handler modules. Use `vercel.json` rewrites (e.g., `/api/birds` -> `/api/editor?route=birds`) to preserve clean client URLs.
