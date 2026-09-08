# Migrating blob storage from Supabase Storage to Cloudflare R2

> **Status: done (2026-08-04); Supabase objects deleted 2026-08-06.** All 1040
> objects are in R2, and the app reads and writes there. The Supabase copies
> served as the rollback until they were deleted — see "Rollback".
>
> The plan below was written before the work and assumed a **public** bucket
> fronted by a custom domain or `r2.dev` URL. What was actually built keeps the
> bucket **private**, with every read and write going through the app. The
> sections below have been rewritten to describe what exists; the reasoning for
> the change is under "What was built".

## Why

The project went ~3x over its Supabase free-tier Cached Egress allowance
(16.79 GB against 5 GB). The cause was not real traffic: it was development.
Every deploy starts with a cold CDN cache, so the next page view re-fetches the
originals from Storage, and `next/image` regenerates its size variants — each
variant a separate origin read. A week of heavy iteration (28 commits over 13
days) did it; a single day of work produced a 2.2 GB spike.

Several fixes have already shipped (see "What is already done"), and they make
each cold cache cheaper. **None of them stops it happening again** — the next
busy week will still burn egress, just less of it.

R2 does not charge for egress. At all, at any tier. So the failure mode becomes
structurally impossible rather than merely smaller. That is the point of this
migration; it is not a performance exercise.

R2 free tier: 10 GB storage, 1M writes/month, 10M reads/month. This bucket is
~302 MB, so ~3% of the storage allowance. Beyond the free tier storage is
$0.015/GB-month, i.e. cents.

## Current state (verified 2026-08-04)

Everything below is merged to `main` as `Egress (#43)`.

- **Bucket:** `closet-images`. Described here as it stood on 2026-08-04 —
  public, ~302 MB, 1000+ objects (see "Row limit" below — the true object count
  is above the API's 1000-row cap). The Supabase side is now empty; see
  "Teardown". The R2 bucket of the same name is the live one.
- **Supabase project:** `ynrmmdpxnrblfxqpthbs`, schema `closet`.
- **Tables holding paths:** `closet.images` (95 rows), `closet.vibe_images`
  (258 rows).
- **Path columns:** `storage_path`, `thumb_path`, `micro_path` on both tables,
  plus `video_thumb_path` on `vibe_images` only.
- All 17 videos have a `video_thumb_path` derivative.

### What is already done (do not redo)

- `src/app/storage/[...path]/route.ts` — same-origin read-through proxy with
  `Cache-Control`, `CDN-Cache-Control` and `Vercel-CDN-Cache-Control`.
- `next.config.ts` — `deviceSizes`/`imageSizes` capped to what the app renders.
- `scripts/backfill-video-thumbs.mjs` + `.github/workflows/video-thumbs.yml` —
  weekly transcode of new videos to tile-sized silent mp4s.
- `.github/workflows/page-previews.yml` — daily schedule removed (manual only).
- `SHOW_HOME_PAGE_GHOST_IMAGES = false` in `src/app/page.tsx`.

## Scope

**Move:** the blob objects, and the code that reads/writes them.

**Do not move:** Postgres, auth, RLS, realtime. Supabase stays the database.
Only `storage.objects` and the Storage API stop being used.

## What was built

The bucket is **private**. It has no public URL, no custom domain and no
`r2.dev` access; the R2 credentials never leave the server. That is the one
substantive departure from the original plan, which assumed a public bucket and
`images.remotePatterns`.

Keeping it private cost a little and bought a lot:

- **Reads** stay on the existing same-origin URL, `/storage/<bucket>/<key>`.
  Nothing stored in the database had to be rewritten, no component changed, and
  reverting is still a one-file change. `next.config.ts` needed no
  `remotePatterns` entry.
- **Range requests keep working** because the proxy that forwards them already
  existed and was already tested. A public bucket would have moved video
  scrubbing onto an untested path.
- The cost is a hop: browser -> Vercel -> R2 on a cache miss. Both legs are free
  and the edge absorbs repeat views, so this is latency on a cold cache and
  nothing more.

The proxy is therefore no longer a header-rewriter that could be deleted (as the
plan speculated) — it is the only way in, by design.

### Files

| Path | Role |
| --- | --- |
| `src/lib/data/r2.ts` | Shared `S3Client` and bucket name. |
| `src/app/storage/[...path]/route.ts` | Read path. `GetObject`, forwards `Range`, sets the cache headers. |
| `src/app/api/storage/upload-url/route.ts` | Presigns one `PutObject`. Validates key shape and content type. |
| `src/app/api/storage/delete/route.ts` | Deletes objects (proxied, not presigned). |
| `src/lib/ui/images.ts` | `uploadToStorage`, `uploadToPath`, `deleteFromStorage`. |
| `scripts/migrate-to-r2.mjs` | The one-time copy. Idempotent; safe to re-run. |

### Why uploads are presigned but deletes are not

An upload carries bytes — phone videos of several megabytes — and a serverless
function has a request-body limit well below that, so the browser must reach R2
directly. A delete carries no bytes, so proxying costs nothing, and a signed
delete URL is a more dangerous thing to hand out than a signed write.

### Auth

The app is single-user: `src/lib/data/supabase/middleware.ts` gates every path
except `/login`, `/auth/callback` and `/storage/` on one hardcoded UID, and
`/api/` is inside that. Both routes additionally re-check the session
themselves, so a future edit to the matcher cannot silently turn the presign
route into an open upload endpoint.

### Upload sites

Seven, not the one the plan named. Six go through `uploadToStorage`
(`useItemFormSubmit` ×4, `useVibesData` ×2, `saveCollage` ×1). The seventh is
the colour swatch texture in `ItemForm.tsx`, which is keyed by colour name
rather than by uuid so a re-upload replaces the texture in place — hence
`uploadToPath` and a second key pattern in the presign route.

Four delete sites: `useItemDelete`, `ProductShots`, `useVibesData` ×2, plus the
orphan cleanup in `useItemFormSubmit`.

## Original plan (kept for context)

### 1. Cloudflare setup

- Create an R2 bucket (suggest: `closet-images`, same name, less to think about).
- Create an S3-compatible API token with object read/write on that bucket.
- Expose it for public reads. Two options:
  - **R2 custom domain** (simplest) — attach a subdomain, objects become
    publicly readable over HTTPS with Cloudflare's cache in front.
  - **Worker in front of the bucket** — needed only if access control or
    header rewriting is wanted later. Not needed now; the bucket is already
    public.
- Note the account ID, bucket name, access key ID, secret, and public base URL.

### 2. Copy the objects

Write `scripts/migrate-to-r2.mjs`, modelled on the existing backfills in
`scripts/` (same env handling, same idempotent-and-re-runnable shape).

- List every object in the Supabase bucket. **Paginate** — see "Row limit".
- For each: download from Supabase, `PutObject` to R2 at the *same key*, verify
  size matches.
- Idempotent: skip keys already present in R2 with the same size, so a failed
  run can just be re-run.
- Do not delete anything from Supabase. Keep it as the rollback until the new
  path has been live and correct for a while.
- Expect ~302 MB and 1000+ objects. This is the one unavoidable big egress
  read — it is a single ~302 MB pull, not a recurring cost.

### 3. Point the app at R2

The read path is centralised, which makes this small:

- `src/lib/ui/images.ts` — `publicImageUrl()` is the single choke point every
  image and video src is built from. `thumbImageUrl`, `microImageUrl` and
  `videoThumbUrl` all delegate to it. Repointing it is the core of the change.
- Decide whether `src/app/storage/[...path]/route.ts` survives. It exists purely
  to put a cacheable header in front of Supabase's `Cache-Control: no-cache`.
  R2 + a custom domain already serves cacheable responses from Cloudflare's
  edge, so the proxy is probably redundant — but check R2's default headers
  before deleting it, and keep the year-long `immutable` lifetime either way
  (paths are content-addressed UUIDs; bytes at a given path never change).
  - If the proxy goes, `publicImageUrl` returns an absolute R2 URL, and
    `next.config.ts` needs `images.remotePatterns` for the R2 hostname.
  - If the proxy stays, only `SUPABASE_PUBLIC_OBJECT_BASE` changes.
- Range requests must keep working — the vibes gallery seeks within mp4s. The
  current proxy forwards `Range` deliberately. Verify a `206` still comes back
  after the switch.

### 4. Move the write path

- `uploadToStorage()` in `src/lib/ui/images.ts` is the single upload helper
  (originals + `thumb`/`micro` derivatives). It currently takes a
  `StorageUploader` shaped around the Supabase client.
- R2 writes need credentials, so they cannot happen from the browser as they do
  now. Add a route handler (e.g. `src/app/api/upload/route.ts`) that either
  proxies the upload or issues a presigned `PutObject` URL, and have
  `uploadToStorage` use it. **Presigned URLs are preferable** — the file goes
  browser → R2 directly instead of through the Vercel function, which avoids
  function payload limits on multi-MB videos.
- Keep the existing behaviour exactly: UUID names via `safeExtension`,
  client-side `makeThumbnail` for both tiers, and a failed derivative yielding a
  null path rather than failing the upload.
- `scripts/backfill-video-thumbs.mjs` also reads and writes objects — update it
  and re-run to confirm.

### 5. Verify before deleting anything

- Every grid, detail page, collage/flatlay editor, planner and the co-wear graph
  render images.
- Videos play and loop in the vibes gallery; scrubbing works (`206` responses).
- Upload a new image **and** a new video; check original + derivatives land in
  R2 and the row's paths are written.
- Download action still returns the original.
- `curl -I` a thumbnail twice: expect a cache MISS then HIT.
- Watch Supabase egress drop to ~zero over a few days.

Only then consider deleting the Supabase objects. There is no hurry — 302 MB is
inside the free storage tier.

## Gotchas

- **Row limit.** Per `CLAUDE.md`, the Supabase Data API silently truncates every
  select at 1000 rows. `storage.objects` reports 1040 and is therefore *already
  past the cap*. The migration script must paginate with `.range()` and give
  every select an explicit `.order()`, or it will silently skip objects. This is
  the single most likely way to lose files.
- **Alternatives.** Also per `CLAUDE.md`: in `outfit_items` /
  `outfit_wear_items`, rows with `parent_item_id` set are alternatives, not worn
  items. Not directly relevant here, but any query written along the way must
  respect it.
- **Four path columns, not one.** `storage_path`, `thumb_path`, `micro_path`,
  `video_thumb_path`. A migration that only moves `storage_path` breaks every
  grid on the site.
- **Derived-object naming.** Derivatives are siblings by convention:
  `<uuid>.thumb.webp`, `<uuid>.micro.webp`, `<uuid>.thumb.mp4`. Copying keys
  verbatim preserves this; renaming during the copy would break the backfills.
- **Do not run `next build`.** Per `CLAUDE.md`, it corrupts the running dev
  server's `.next`. Use `tsc --noEmit`.
- **CORS is required for uploads.** Presigned `PUT`s go browser -> R2 directly, so
  R2 must allow the app's origin or the browser blocks the request — it surfaces
  as a bare `TypeError: Failed to fetch`, with the preceding presign returning
  200, which makes it look like the app's bug rather than a bucket setting.
  ~~Reads need no CORS: they are same-origin via the proxy.~~ **No longer true**
  — see "Reads went cross-origin" below.
- **A 200 from `/api/storage/upload-url` does not mean an upload happened.** It
  means a URL was signed. The `PUT` itself is browser -> R2 and appears in no
  server log, so verify uploads against the bucket, not the dev server output.
- **No Playwright.** Per `CLAUDE.md`, browser testing does not work in this
  environment — ask the user to check their own browser.
- **`page-previews.yml`** reads from Storage on every run. It is manual-only now.
  If it is ever re-enabled, point `BASE_URL` at the deployed site, not a
  localhost build, and fix the `secure: false` cookie flag in
  `scripts/capture-previews.mjs` first (an https origin rejects it).

## What was verified (2026-08-04, local dev)

- **Copy:** 1040/1040 objects, size-checked key by key against a fresh listing of
  both sides. 0 missing, 0 mismatched. Matches `storage.objects`' own count, so
  the recursive paginated walk missed nothing.
- **Reads:** grids, item detail, planner and the vibes gallery all render.
- **Video:** `206` responses on `.thumb.mp4` and `.mp4`, repeatedly, while
  seeking — scrubbing works.
- **Upload:** an image produced the original plus both derivative tiers in R2
  with correct sibling naming, and a `vibe_images` row pointing at all three.
  Objects are written before the row, so a mid-way failure leaves unreferenced
  objects rather than a row pointing at nothing.
- **Delete:** removing that image took all three objects and the row with it. The
  bucket returned to exactly 1040 objects / 316.3MB — a full upload/delete cycle
  leaves no residue.
- **Writes go to R2 only:** the new upload was absent from Supabase Storage.
- `tsc --noEmit` clean.

Not yet exercised: the collage/flatlay editor upload, product-shot delete, item
delete, and the colour swatch texture upload. All four use the same two routes as
the paths above.

## Setup (done)

- **Vercel env vars** — `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
- **GitHub secrets** — the three R2 values, for `video-thumbs.yml`.
- **CORS** — the bucket allows `http://localhost:3000` and `https://*.vercel.app`.
  Production is `shirinscloset.vercel.app`, which the wildcard covers. A custom
  domain would have to be added explicitly.

## What is left

Nothing. Egress fell to ~zero (last non-trivial day 2026-08-04, the migration's
own final read), and the Supabase objects were deleted on 2026-08-06 after being
backed up locally — see "Teardown".

## Reads went cross-origin (2026-08-13)

Moving off Supabase fixed *Supabase's* egress bill and simply relocated the cost:
the read proxy still pulled every object through a serverless function, and
Vercel bills that as CDN-to-Compute transfer. Closet spent 3.06 GB of it in
thirty days, 36.4% of the whole account. Separately, `next/image` billed 3,953
transformations over the same window, re-deriving tile-sized images from
originals the upload pipeline had already downscaled.

Both are gone, by the same move:

- `src/app/storage/[...path]/route.ts` no longer serves bytes. It signs a
  6-hour R2 URL and `302`s to it, so the browser fetches from R2 — whose egress
  is free — and the function carries only the signature. Range handling went with
  it; R2 serves partial content itself, so video scrubbing is unaffected.
- Every storage-backed `next/image` became a plain `<img>` (8 files). They were
  all already requesting `thumb_path` / `micro_path` / `video_thumb_path`
  derivatives, so the transformations bought nothing. `next/image` also cannot
  follow a redirect to a signed URL, so the two changes had to land together.
  `src/app/login/UnauthorizedImage.tsx` keeps `next/image`: it is a bundled local
  asset, costs no origin read, and is not affected by the redirect.

**CORS now applies to reads.** This is the one thing that can regress silently.
The redirect makes every image cross-origin, which is invisible to ordinary
rendering — `<img>` does not need CORS to display — but *is* visible to
`markHeroTheme` in `FavoriteInspo.tsx`, which samples the hero's pixels onto a
canvas. Without `Access-Control-Allow-Origin` from R2 the canvas is tainted and
`getImageData` throws, so the mobile hero title silently loses its light/dark
treatment. The element sets `crossOrigin="anonymous"`, which only helps if the
bucket answers with the header.

The bucket's CORS rules could not be read or set from here: the API token is
scoped to object read/write and `GetBucketCors` returns `AccessDenied`. So the
rules must be checked in the Cloudflare dashboard, and two things need
confirming — that `GET` is in `AllowedMethods` (the existing rules were written
for upload `PUT`s), and that the dev origin is `http://localhost:3005`, since
this app's dev server runs on 3005 while the rules as documented name 3000.

## Teardown (2026-08-06)

The Supabase Storage objects are gone. `storage.objects` for `closet-images`
reports 0 rows; `closet.images` and `closet.vibe_images` were not touched.

They were deleted five days ahead of the ~2026-08-11 date this file and `todo.md`
both named. What that date was buying was time for a read path nobody had opened
yet to fail — and the deletion was brought forward deliberately, against that,
once a local backup made the step reversible by other means. The date guarded an
irreversible action; the backup removes the irreversibility, not the caution.

`scripts/backup-supabase-storage.mjs` did it, in three gated phases:

- **Download** — every object to `supabase-storage-backup/` (gitignored), using
  the same paginated `walk()` as `migrate-to-r2.mjs`, plus a `manifest.json` of
  key, size and sha256 per object. 1040 downloaded, 0 failed, 316.3 MB.
- **Verify** — re-lists the bucket from Supabase and checks each object against
  disk. It deliberately ignores the manifest when deciding *what should exist*: a
  backup verified against its own notes would pass even having skipped a whole
  subtree. 1040/1040, 0 mismatched. All 1040 sha256s were also re-checked after
  the folder was moved and copied back.
- **Delete** — refuses to run unless a fresh verification passes in the *same*
  invocation, so the check and the deletion cannot drift apart. 1040 removed in
  batches of 100; bucket re-listed at 0 afterwards, confirmed independently
  against `storage.objects`.

The script is kept rather than deleted: `--verify` still works against a restored
backup folder, which is what a future restore would start from.

## Rollback

**There is no longer a rollback to Supabase Storage.** Reverting
`src/app/storage/[...path]/route.ts` to the Supabase URL now serves 404s for
everything — the objects it would point at are deleted.

R2 is the only live copy. The cold copy is the local backup taken on 2026-08-06
(1040 objects, 316.3 MB, `manifest.json` alongside), which the user moved out of
the repo. A restore means re-uploading from that folder — to R2 with a script
shaped like `migrate-to-r2.mjs` but sourced from disk, or to Supabase Storage if
the decision is ever reversed. Keys are preserved verbatim in the folder layout,
so nothing stored in the database has to change either way.

Note the asymmetry that already applied before deletion and still does: anything
uploaded since 2026-08-04 exists **only** in R2 and is not in that backup. The
backup is a floor, not a mirror — it restores the closet as of 2026-08-06, and
newer uploads would be lost. If this copy is ever the one that matters, check its
date against what has been added since.
