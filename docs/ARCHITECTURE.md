# System Architecture

Essential architecture blueprint and infrastructure constraints.

---

## 1. Stack Overview

* **Database & Auth:** Supabase (Postgres + GoTrue Auth). Details in [docs/DATABASE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/DATABASE.md).
* **Object Storage:** Cloudflare R2 (Private bucket via presigned URLs).
* **Hosting & Compute:** Vercel (Next.js serverless functions).
* **Edge Worker:** Cloudflare Worker (`worker/`) for CDN media streaming and hourly cron triggers.

---

## 2. Object Storage (Cloudflare R2)

* **Zero Egress:** R2 replaces Supabase Storage to eliminate egress bandwidth fees.
* **Database Representation:** Tables store storage path strings, never binary payloads.
* **Private Bucket Access Pattern:**
  * **Uploads:** Browser requests a presigned PUT URL from `/api/storage/upload-url` and uploads directly to R2.
  * **Reads:** Server endpoints issue a 302 redirect to a short-lived signed R2 URL, offloading byte-streaming from Vercel compute.
  * **Deletes:** Proxied securely through authenticated server routes.
* **Media Rendering:**
  * Use standard `<img>` tags for R2 assets. `next/image` burns optimization quotas and cannot follow 302 redirects to signed URLs.
  * Generate thumbnails client-side before upload.
* **Cloudflare Worker (`worker/`):**
  * Serves media with edge caching directly from the R2 binding.
  * Supports HTTP 206 Range requests for iOS Safari video playback and scrubbing.
  * Runs hourly cron triggers (`0 * * * *`) calling `/api/cron/` endpoints to bypass Vercel Hobby plan daily cron limits.

---

## 3. Security & Row Level Security (RLS)

* **RLS is the True Gate:** The Supabase anon key is public. Middleware protects page routes, but RLS is the only gate for data queries.
* **Authentication:** Google OAuth (`auth.uid()`).
* **Access Patterns:**
  * **Multi-user schemas:** Enforce `auth.uid() = user_id`.
  * **Single-user schemas:** Enforce `auth.uid() = '<authorized-uuid>'` via a `SECURITY DEFINER` helper.
* **Hardening Checklist:**
  * Revoke function execution privileges from `PUBLIC` and `anon`.
  * Reverse `ALTER DEFAULT PRIVILEGES` for `anon` on custom schemas.
  * Enforce explicit `auth.uid()` checks inside `SECURITY DEFINER` functions.
  * Follow [docs/supabase-security-audit.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/supabase-security-audit.md) for full audit procedures.

---

## 4. Vercel Deployment & Serverless Limits

* **Region Co-location:** Pin Vercel functions to Dublin (`dub1` in `vercel.json`) to match Supabase (`eu-west-1`). Cross-region calls add severe latency hops.
* **12 Function Limit (Hobby Plan):** Vercel Hobby caps accounts at 12 serverless functions total.
* **Dispatcher Pattern:** Consolidate related API handlers into a single route dispatcher with `vercel.json` rewrites to stay within function limits.
