# Supabase RLS Audit & Lockdown Playbook

A portable prompt/checklist for hardening a Supabase project's Row Level Security.
Copy this file into any project and hand it to Claude (with Supabase MCP access).

**Nothing here is project-specific.** Fill in the schema name and any known
authorized user IDs as you go.

---

## The problem this catches

Supabase projects often ship with `USING (true) WITH CHECK (true)` policies — the
"allow all so I can get building" placeholder. RLS shows as *enabled* in the
dashboard, so it looks correct, but it enforces nothing.

The anon (publishable) key is **public by design** — it ships in your JS bundle,
and anyone can read it out of devtools. It is not a secret. The only thing
standing between that key and your data is RLS. If your policies say `true`,
anyone can do this and get everything:

```bash
curl "https://<project-ref>.supabase.co/rest/v1/<table>?select=*" \
  -H "apikey: <anon-key>" -H "Accept-Profile: <schema>"
```

No login screen involved. An app-layer auth gate (middleware, a route guard, an
allowlist check in your framework) does **not** protect the REST API — it only
protects the pages. RLS is the database gate, and it is the only one that applies
to requests that never touch your app.

---

## Two important distinctions

**Supabase Auth ≠ RLS.** Auth answers *"who are you?"* — it runs the OAuth flow
and issues a JWT. RLS answers *"what are you allowed to touch?"* — it's a Postgres
feature, entirely separate. A working login is a door with a working lock standing
next to an open window; nothing forces a caller to use the door.

**Authenticated ≠ authorized.** Anyone with a Google account can complete an OAuth
flow and become `authenticated`. If your policies only check `TO authenticated`,
you have allowed the entire internet. Policies need an actual predicate —
ownership (`auth.uid() = user_id`) or an allowlist check.

---

## Phase 1 — Audit (read-only)

> Give this to Claude verbatim. **Emphasize: change nothing. Report and stop.**

Audit the RLS setup on Supabase project `<project-ref>`, schema `<schema>`.
Read-only — no migrations, no DDL. Report and stop.

1. **REST exposure.** Is this schema exposed via PostgREST? (Not visible in
   Postgres — it's in Dashboard → Project Settings → API → Exposed schemas.) An
   unexposed schema makes grant problems latent rather than live, but still worth
   fixing, since exposing a schema is one toggle someone flips later.
2. **Per table:** RLS enabled? Forced? List every table.
3. **Every policy verbatim** from `pg_policies` — table, name, command, roles, and
   exact `USING` / `WITH CHECK` text. Flag any that are `true`.
4. **Two separate lists:** tables with RLS *disabled*, and tables with RLS enabled
   but *zero* policies.
5. **Grants** on tables, sequences, and functions, plus schema `USAGE` — for
   `anon`, `authenticated`, **and `PUBLIC`**. Check `PUBLIC` explicitly (see traps).
6. **`ALTER DEFAULT PRIVILEGES`** entries on the schema, for tables, sequences,
   and functions.
7. **Functions:** `SECURITY DEFINER` vs `INVOKER`, `search_path` setting, and for
   definer functions whether there's any authorization check in the body.
8. **Views and materialized views:** any with `security_invoker = false`? Also
   check whether views in *other* schemas read from this one.
9. **Ownership shape:** is there a `user_id` / `owner_id` column? Does anything
   reference `auth.uid()`? This determines which fix pattern applies.
10. **Users:** how many rows in `auth.users`, and how many distinct owners actually
    appear in the data?
11. **Storage buckets:** the `public` flag and every `storage.objects` policy.
    Storage is a **separate** surface — locking tables does nothing for it.
12. **`get_advisors`** for `security` and `performance`.

Then answer plainly: **if someone pulled the anon key out of the JS bundle and hit
the REST API directly, never touching the login screen — what could they read,
insert, update, or delete?** Name tables and row counts.

---

## Traps — every one of these was hit in a real audit

**`PUBLIC` grants hide behind `anon`.** Functions are often granted `EXECUTE` to
`PUBLIC` (shows as `=X/postgres` in the ACL). `anon` inherits from `PUBLIC`, so
`REVOKE ... FROM anon` alone does nothing. You must also `REVOKE ... FROM PUBLIC`,
then re-grant to `authenticated` explicitly. This produces a lockdown that looks
complete and isn't.

**`ALTER DEFAULT PRIVILEGES` re-arms future tables.** If defaults grant `anon`,
every table you create later is automatically wide open from the moment it exists
— before you've written a policy, with no advisor lead time. Reverse these even if
today's tables are fine. *This is often the single most valuable fix.*

**`SECURITY DEFINER` functions bypass RLS entirely.** They run as the owner. While
policies are `true` this is invisible; the moment you lock the tables down, these
become the surviving hole. Each one needs its own authorization check **in the
function body**. Two independent defenses is right: the grant layer stops `anon`,
the in-body guard stops a signed-in-but-unauthorized user.

**Never revoke `anon` from the `auth` schema.** `anon` legitimately needs GoTrue
access to run the login flow *before* a session exists. Scope every revoke to your
schema by name. A broad `REVOKE ... ON ALL SCHEMAS` locks everyone out at login,
with no way back in through the app.

**Storage is separate.** Locking tables does nothing to buckets. Note that while a
bucket is `public = true`, requests to `/storage/v1/object/public/...` **bypass
`storage.objects` RLS completely** — so the SELECT policy only governs `list()`,
`download()`, and `createSignedUrl()`. Narrowing that policy kills anonymous
*enumeration* but not direct-URL fetches. Going fully private means
`public = false` **plus** switching the app from `getPublicUrl()` to
`createSignedUrl()` — real app work, so decide deliberately.

**Check `INSERT`/`UPDATE`/`DELETE` policies on buckets too.** Anonymous *writes*
or *deletes* to storage are worse than anonymous listing, and the default policy
set often leaves all four open.

**Error-swallowing makes smoke tests worthless.** If your app catches errors and
returns `[]` or `{count: 0}`, a permissions failure and a working page look
*identical*. RLS failures are silent — empty results, not errors. Never verify a
lockdown by "the page still renders." Verify at the database, and check real
counts.

**`TRUNCATE` is not subject to RLS.** If a role holds it, policies won't save you.
Narrow grants to `SELECT, INSERT, UPDATE, DELETE` (`arwd`) — no app needs
`TRUNCATE`, `REFERENCES`, `TRIGGER`, or `MAINTAIN`.

**Pin `search_path` on functions**, including trigger functions
(`SET search_path = ''`). But *test that triggers still fire afterward* — an empty
search_path fails at runtime, not at migration time.

---

## Choosing a fix pattern

Determined by audit item 9. **Do not port the wrong one** — this is the mistake a
future session is most likely to make.

### Pattern A — per-user ownership (preferred when the schema supports it)

The schema already has `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)`,
or you're willing to add it.

```sql
create policy "users read own rows" on <schema>.<table>
  for select to authenticated using (auth.uid() = user_id);
-- plus insert (with check), update (using + with check), delete (using)
```

Scales to any number of users with no further change. Prefer this for anything
that might ever be multi-user.

### Pattern B — single-user gate (when there's no ownership column)

No `user_id` anywhere, and adding one means backfilling every table plus threading
it through every insert path in the app.

```sql
create function <schema>.is_authorized() returns boolean
  language sql security definer stable set search_path = ''
as $$ select auth.uid() = '<authorized-uuid>'::uuid $$;

revoke execute on function <schema>.is_authorized() from public;
grant execute on function <schema>.is_authorized() to authenticated;

create policy "authorized access" on <schema>.<table>
  for all to authenticated
  using (<schema>.is_authorized())
  with check (<schema>.is_authorized());
```

Equally secure, but it encodes *an identity* rather than *a rule*. Retrofitting
ownership later is a real migration (backfill + policy rewrite + every insert path
+ auditing `SECURITY DEFINER` functions). That's a legitimate trade for a truly
single-user app — just make it knowingly.

**Prefer UID over email** in an allowlist: emails can change, UIDs can't.

---

## Phase 2 — Apply

Only after reviewing Phase 1 output. As one migration:

1. Create the helper function if using Pattern B (remember: `REVOKE EXECUTE FROM PUBLIC`,
   then grant to `authenticated`).
2. Drop every permissive policy **by exact table + name** — policy names are only
   unique per table, and duplicates across tables are common.
3. Create replacements scoped `TO authenticated` with a real predicate.
4. Revoke from `anon`: all table privileges, sequence privileges, schema `USAGE`.
   Revoke function `EXECUTE` **from `PUBLIC` as well as `anon`**, then re-grant to
   `authenticated`.
5. Reverse `ALTER DEFAULT PRIVILEGES` for `anon`. Consider narrowing the
   `authenticated` default to `SELECT, INSERT, UPDATE, DELETE`.
6. Add authorization guards inside every `SECURITY DEFINER` function.
7. Pin `search_path` on functions missing it.
8. Narrow storage policies (all four commands, not just SELECT).

**Leave `service_role` untouched** — it bypasses RLS by design, and backfill or
import scripts depend on it. Verify no `service_role` key is ever constructed in
client-side code.

**Before revoking `anon`,** confirm nothing legitimately uses it: check every
Supabase client construction in the codebase, plus CI workflows, build steps, and
`scripts/`. Cookie-session clients (`@supabase/ssr`) run as `authenticated` and are
safe. A bare anon key used server-side is not. Also check git history for recently
deleted sync jobs.

---

## Phase 3 — Prove it

Don't accept "should be fine."

1. **Impersonation probe** in an aborted transaction — as `anon`, as an
   unauthorized user, and as the authorized user. Show that `anon` fails at the
   grant layer (`42501: permission denied for schema ...`) rather than returning an
   empty set. The distinction matters: a grant-layer rejection can't be swallowed
   by app error handling.
2. **Real curl** with the anon key over the network. Expect `42501` /
   `permission denied`. A `200` with rows is a failure.

   ```bash
   curl -i "https://<ref>.supabase.co/rest/v1/<table>?select=*&limit=5" \
     -H "apikey: <anon>" -H "Authorization: Bearer <anon>" \
     -H "Accept-Profile: <schema>"
   ```

   *On Windows, if curl exits 35 with a schannel revocation error, retry with
   `--ssl-no-revoke` — that's a local cert-check quirk, not a server response, and
   it doesn't weaken the test.*
3. **Hit every `SECURITY DEFINER` RPC anonymously** and confirm rejection.
4. **Re-run `get_advisors`** — `rls_policy_always_true` findings should be gone.
5. **Test triggers actually fire** if you changed any `search_path`.
6. **Log into the app and check real data appears, with correct counts.** Not that
   pages render — see the error-swallowing trap.

---

## Quick reference

| Symptom | Meaning |
|---|---|
| `42501 permission denied for schema` | Blocked at grant layer — never reached the tables |
| `200` with `[]` | Grants passed, RLS filtered everything out |
| `200` with rows, using anon key | **Not locked down** |

ACL bits: `a`=INSERT `r`=SELECT `w`=UPDATE `d`=DELETE `D`=TRUNCATE `x`=REFERENCES
`t`=TRIGGER `m`=MAINTAIN `U`=USAGE `X`=EXECUTE `C`=CREATE.
`arwdDxtm` = everything. `arwd` = the four DML privileges you actually want.
An ACL entry with an empty grantee (`=X/postgres`) means **`PUBLIC`**.
