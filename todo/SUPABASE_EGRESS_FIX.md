# Cutting Supabase Cached Egress on image-heavy Next.js + Vercel projects

Applies to any Next.js app deployed on Vercel that serves images/videos from a
public Supabase Storage bucket and is hitting the Supabase free-tier **Cached
Egress** quota (Project Settings > Usage). Two independent fixes, both free,
no custom domain required. Do both — they stack.

## Why this happens

Every `<img src="https://<project>.supabase.co/storage/v1/object/public/...">`
is a direct hit to Supabase's own CDN. If the app renders plain `<img>` tags
(no `next/image`) and has no caching layer in front of Supabase, *every* page
view of *every* image re-fetches from Supabase and counts against Cached
Egress — even for the exact same image loaded seconds earlier by the same or
a different visitor.

## Fix 1: Route storage URLs through Vercel's edge (rewrite proxy)

Turns your own Vercel domain into a cache in front of Supabase Storage.
Repeat requests hit Vercel's edge cache instead of Supabase.

**1. Add a rewrite in `next.config.ts` / `next.config.js`:**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/storage/:path*",
        destination:
          "https://<YOUR-PROJECT-REF>.supabase.co/storage/v1/object/public/:path*",
      },
    ];
  },
};

export default nextConfig;
```

**2. Find (or create) the one function that builds public storage URLs.**
Most apps already funnel this through a single helper — e.g.:

```ts
export function publicImageUrl(storagePath: string): string {
  return `/storage/${STORAGE_BUCKET}/${storagePath}`; // relative, same-origin
}
```

If the app instead builds the full `https://<project>.supabase.co/...` URL
inline in multiple components, consolidate it into one helper first — this
fix (and any future change to how images are served) is only a one-line edit
if there's a single choke point, versus a hunt-and-replace across the
codebase otherwise.

**3. Grep for any other place that builds a raw Supabase storage URL**
(`storage/v1/object/public`, `supabase.co/storage`) and route it through the
same helper, so nothing bypasses the proxy.

**4. If using `next/image` with `remotePatterns` pointed at the Supabase
hostname,** you can remove that entry — URLs are now relative/same-origin, so
the default loader handles them without a remote pattern.

No new infra, no domain purchase — this rides on the Vercel deployment
that's presumably already there.

## Fix 2: Switch `<img>` tags to `next/image`

Vercel's image optimizer resizes, converts to WebP/AVIF, and caches the
result at Vercel's edge — separate from and complementary to Fix 1.

For each `<img>`:

- **Fixed-box / grid tiles** (a `position: relative` container with a known
  size, e.g. a square thumbnail or a tile cropped via `object-fit: cover`):
  swap to `<Image fill sizes="..." />`, keep the existing CSS
  (`object-fit`, `object-position`) — it still applies to the `<img>`
  `next/image` renders internally.
- **Natural-aspect images with no stored width/height** (e.g. product photos
  or cutouts rendered at `width: 100%; height: auto` so each photo's own
  aspect ratio decides the layout): **do not** force these into `fill` —
  it requires a fixed-size box and will distort or letterbox photos whose
  real aspect ratio varies. Leave these as plain `<img>` unless the DB
  stores each image's width/height (then pass those to a non-`fill`
  `<Image width={} height={} />`).
- **Local blob/object-URL previews** (`URL.createObjectURL(file)` for
  not-yet-uploaded files): `next/image` can't optimize `blob:` sources.
  Either pass `unoptimized={src.startsWith("blob:")}`, or just leave that
  specific component as raw `<img>` if it's a low-traffic editing view.
- Always set `sizes` to roughly match the rendered width — otherwise the
  optimizer may generate more distinct resolutions than necessary.
- Videos (`<video>`) are unaffected by any of this — `next/image` doesn't
  apply to video, and video isn't usually the Cached Egress driver since it
  doesn't get re-optimized/re-fetched at the same rate as small image tiles
  in grids.

Prioritize by traffic: grids/lists rendered on every page view first, then
detail-page hero images, then editor-only or rarely-viewed views last.

## Verifying it worked

There's no immediate signal — Vercel's edge cache needs a few days of real
traffic to warm up before Supabase's **Cached Egress** graph
(Project Settings > Usage) visibly trends down. Don't judge it same-day.

## What this doesn't fix

Both fixes reduce *repeat* fetches. They don't reduce the cost of each
distinct image's *first* fetch, and they introduce a new (usually much more
generous) quota: Vercel's own image-optimization usage on the Hobby/free
tier. If Cached Egress is still high after a few days, the next lever is
usually a real storage migration (e.g. Cloudflare R2, which has zero egress
fees) — a bigger, separate project, not a config tweak.
