# Why this app stores images the way it does

## Images live in Cloudflare R2, not the database

The database (Supabase) only stores a *path* to each image, never the image
bytes themselves. The actual files sit in a Cloudflare R2 bucket (S3-compatible
object storage).

**Why:** databases are expensive/slow to grow with binary blobs, and R2 charges
**zero egress fees** — meaning it costs nothing to serve images out to users,
no matter how much traffic there is. That's the deciding factor over other
storage providers (S3, etc.), which charge per GB served.

## The server never touches the image bytes

Uploads go browser → R2 directly (via a short-lived, permission-scoped URL the
server hands out). Downloads work the same way: the app redirects the browser
to a temporary signed R2 link rather than fetching the image itself and
passing it along.

**Why:** if the server had to funnel every image through itself, it would be
paying for compute time on every single image load, on top of R2 already being
free to serve from. Cutting the server out of the data path is what makes
"free egress" actually free in practice. It also means large files (e.g. video)
aren't limited by how much data a server function is allowed to handle in one
request.

The bucket itself stays private/locked down — nobody can just guess a URL and
pull an image.

**Updated 2026-09-04, for the Wingspan card generator's images only.** Bird
photos, card art and pack badges (`birds/`, `cards/`, `packs/`) no longer use
expiring links. They are served by a Cloudflare Worker that reads the bucket
directly and marks the bytes cacheable for a year, so those URLs are stable and
permanently readable by anyone holding one. That was a deliberate trade: a URL
that keeps changing cannot be cached, and the expiring-link design meant every
image was re-downloaded and re-signed instead of reused, which is what made the
card generator slow. Photos of real game boards (`boards/`) and bird sounds
(`sounds/`) are NOT exposed — the Worker refuses every key outside those three
prefixes, and the bucket itself is still private with no public URL.

## Every image also gets a small "thumbnail" copy

When a photo is uploaded, the browser — before the upload even happens —
generates a second, much smaller compressed copy (roughly a twentieth the
size) and uploads that alongside the original. Places like a gallery grid load
the small version instead of the huge original photo.

**Why:** a modern phone photo can be 10-20+ MB. Loading a whole grid of those
at full size would be slow and wasteful when the on-screen tile is a couple
inches wide. The full-resolution original is still kept untouched, for when
someone wants to actually view or download it in full quality — the thumbnail
is purely a cheap stand-in for browsing.

If thumbnail generation fails for any reason (unsupported format, etc.), the
app just keeps the original and skips the thumbnail — a missing thumbnail is
never allowed to block the upload itself.

Videos don't get thumbnails; the browser already only loads a video's metadata
(not the whole file) until someone presses play, so there's nothing extra to
save.

## Summary

| Decision | Reason |
|---|---|
| Store files in R2, not the DB | R2 is built for this and has free egress |
| Server hands out temporary links instead of serving files itself | avoids paying for server compute on every image load; no file-size limits |
| Bucket is private with expiring links | files aren't publicly guessable or permanently shareable |
| Generate a small thumbnail on upload | grids/lists load fast without shrinking full-quality originals |
| Thumbnail failures are non-blocking | the real photo is what matters; the thumbnail is a nice-to-have |
