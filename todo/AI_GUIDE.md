Read this before starting a new vibecoded project.

# Stack defaults

- Deploy: **Supabase (Postgres + Auth) + Cloudflare R2 (files) + Vercel (hosting)**.
- Supabase: one project **per audience**, schema-per-app within it, not one project per app — see [Database](#database) below for which project a new app belongs in.

# Data
## Database

### One Supabase project per audience

Two live projects, not one per app:
- `ynrmmdpxnrblfxqpthbs` — single-user personal apps (Closet, Gratitude), each in its own schema, gated by a single-user RLS check.
- `grudobuwddhcevbmnygb` — a multi-user app (Wingscorer) plus a sibling app (wingspan-card-generator) that bridges into it via `SECURITY DEFINER` RPCs in `public`; schema `wingscorer`, real per-row RLS (anon gets read-only, every mutation goes through an API route on the service role).

Pick a project by audience, not by app: a new single-user tool joins the private project as its own schema; anything with real other users gets (or joins) a "public" project with per-user or anon-safe RLS designed in from the start, not retrofitted.

### Gotchas

- Supabase's Data API silently truncates any select at 1000 rows with no error — always paginate with `.range()` + explicit `.order()` for anything that could exceed that, and use `count: "exact", head: true` for counts instead of fetching-and-counting client-side.

### Migrations

- **Only through the Supabase MCP's `apply_migration`, never as local SQL files in the repo.** `supabase_migrations.schema_migrations` in the database is the actual history — a hand-numbered `db/` folder in one project drifted from it (19 files vs. 95 real migrations, with numbering collisions) and was deleted outright rather than reconciled.
- **After any schema change, exercise a real write, not just a read.** A `SECURITY DEFINER` RPC that lists columns explicitly broke three separate times after column renames — each time invisible until someone actually tried to save, because every read kept working. A page loading is not proof a schema change is safe.
- **Postgres RPC overload footgun**: a parameter with `DEFAULT NULL` makes that function ambiguous against a same-named sibling with no arguments — this caused a real `42725: function ... is not unique` outage. When dropping or changing an RPC's parameters, confirm no old overload is still sitting there.

## File Storage
### Supabase free-tier pressure (egress)

Don't put files in Supabase Storage at all — go straight to R2 per the section above. R2 has zero egress fee at any tier; Supabase Storage's free-tier Cached Egress (5 GB) gets blown through by dev iteration alone (every deploy cold-starts the CDN cache, so the next page view re-fetches every image from origin), not real traffic. Starting on Supabase Storage just means migrating to R2 later anyway — see [R2_MIGRATION.md](R2_MIGRATION.md) for what that migration involved.

### Images / files in R2

- The DB stores only a **path** (`storage_path`, `thumb_path`, `micro_path`, and `video_thumb_path` for video), never bytes. Files live in a private R2 bucket.
- **Bucket is private**, no public URL/custom domain. Reads and writes never expose R2 credentials to the browser:
  - **Uploads**: browser → R2 directly via a short-lived **presigned PUT URL** the server hands out (`/api/storage/upload-url`). Presigned because upload bodies (multi-MB phone photos/videos) would blow past a serverless function's body-size limit.
  - **Deletes**: proxied through the server, not presigned — no bytes involved, and a signed delete URL is more dangerous to hand out than a signed write.
  - **Reads**:
    1. First built as a same-origin proxy route that fetched the object from R2 and streamed it back — this is what fixed the *original* Supabase egress problem.
    2. That proxy itself became a cost (Vercel bills proxied bytes as "CDN-to-Compute transfer" — hit 3+ GB/month here). Fixed by having the route **redirect (302) to a signed R2 URL** instead of streaming bytes itself. The function only signs a URL; R2 serves the bytes for free.
  - **Watch for:** a signed-URL redirect makes every image load cross-origin. Anything that reads pixels off an `<img>` onto a `<canvas>` (color sampling, etc.) needs R2's CORS to send `Access-Control-Allow-Origin`, or `getImageData` throws silently.
- **Thumbnails**: generated client-side at upload time (before the upload even happens), uploaded alongside the original. A thumbnail failure never blocks the upload — the original is what matters, the thumbnail is a nice-to-have.
- **`next/image` vs plain `<img>`**: `next/image`'s optimizer is *not* free — it re-derives resolutions from files that are often already pre-sized thumbnails, and its transformation count is its own quota (thousands/month here). Once files are pre-thumbnailed and served from your own storage, prefer plain `<img>` for anything backed by R2/Supabase storage. `next/image` also cannot follow a redirect to a signed URL, so the two decisions (signed-URL reads + plain `<img>`) had to land together. Keep `next/image` only for bundled local/static assets.



## Security
### Supabase RLS
- The anon key is public (ships in the JS bundle) — RLS is the only real gate on it, not app-level auth/middleware. Confirmed by checking: Gratitude *does* have an app-level gate (`src/proxy.ts` — Next.js renamed `middleware.ts` to `proxy.ts` in the version these projects are on), which checks the Google session, an email allowlist, and a PIN. That gate is real and worth having, but it only protects pages served by the app — it does nothing for someone who pulls the anon key out of the JS bundle and hits the Supabase REST API directly, skipping the app entirely. RLS is what closes that door; treat app-level auth as a UX layer on top of RLS, never a substitute for it.
- **Prefer Google OAuth** (`auth.uid()`) over email/password.
- Two fix patterns depending on the app:
  - **Per-user ownership** (`auth.uid() = user_id`) — preferred, scales to multi-user.
  - **Single-user gate** — a `SECURITY DEFINER` helper function checking `auth.uid() = '<uuid>'`, used when there's no `user_id` column and adding one is a real migration. This is what Closet uses (it's single-user).
- Common traps to check every time: `PUBLIC` grants leaking through to `anon` (revoking from `anon` alone isn't enough), `ALTER DEFAULT PRIVILEGES` re-arming future tables, `SECURITY DEFINER` functions bypassing RLS, storage bucket policies being a *separate* surface from table RLS.

# Deployment
## Vercel free-tier pressure (function count)

The Hobby plan caps a deployment at **12 Serverless Functions**, and Vercel maps one API route file to one function — so a handful of single-purpose `api/*.js` files burns through the cap fast. Once several small, internal routes share a client (e.g. one Supabase client) and aren't a public versioned contract, consolidate them into **one dispatcher function** instead of one file each:
- Write one function (e.g. `api/editor.js`) holding a `ROUTES` map from a route name to its handler module, and have it just call the right one.
- In `vercel.json`, rewrite each public path (`/api/birds`, `/api/packs`, etc.) to `/api/editor?route=<name>` — the client-facing URLs stay the same, only the file count drops.
- Do this from the start rather than after hitting the cap.

# Coding Standards
## Code style

- **Small files, folder nesting over code nesting**: e.g. `components/ui/feedback/Skeleton/Skeleton.tsx` + co-located `.module.css`, rather than one large shared file. Split by responsibility into deep folders; keep the code inside each file flat.
- **CSS design tokens, single source of truth**: everything (color, radius, spacing, shadow, z-index) lives in `src/styles/global/tokens.css` / `typography.css`, referenced as `var(--token)`. Closet's rule is explicit and absolute: *never* hardcode a raw value (hex color, px font-size, etc.) anywhere, including "just this once." If a value is needed and no token fits, add the token first.
  - Typography utility classes are named for their **UI role**, not their abstract scale (`.closet-item-card-name`, not `.type-body-medium`) — ask "what is this text *for*" when naming.
  - Component CSS uses `composes: <class> from global` to pull in the shared typography class rather than restating `font-size`/`font-weight`.
- **Comments**: keep to an absolute minimum. Only add one when it's truly needed — never to explain *what* code does (the code itself should make that clear). This is a hard rule stated verbatim in project `AGENTS.md`/`CLAUDE.md` files, not a soft preference.

## Domain rules as named modules

Recurring business logic (e.g. "what counts as a real item vs. an alternative," "which wear-count definition applies where") lives as one named module per rule under `src/lib/domain/`, mirrored by an equivalent Postgres view or RPC where SQL needs the same rule — so the app and the database can't quietly drift apart on what a rule means. Read the module before re-deriving the rule at a new call site.

# Rules

- Never run `next build` in a repo with a running `next dev` server — it writes into the same `.next` and corrupts the dev server. Use `tsc --noEmit` to check types/compile errors instead.
- Playwright/browser automation doesn't work in this dev environment — ask the user to check their own browser rather than trying to test UI yourself.

# User Experience
## Loading states

Skeleton screens (content-shaped placeholders), not spinners. Default to an animated shimmer — a slow (~2s), soft left-to-right sweep, one shared block/class for the whole app, `prefers-reduced-motion` disables it. Only go static if a skeleton can double-mount for the same content (a loading shell handing off to another skeleton underneath), where a restarting animation would glitch.
