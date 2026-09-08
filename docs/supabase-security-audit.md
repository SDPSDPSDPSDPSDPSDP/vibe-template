# Supabase RLS Audit & Lockdown Playbook

> Portable checklist and prompt template for auditing and hardening Row Level Security (RLS) on a Supabase project.

---

## 1. Core Security Principles

* **Anon Key is Public:** The publishable `anon` key is embedded in client JS bundles. RLS is your **only** database-level defense against direct REST API requests (`/rest/v1/...`).
* **Auth ≠ RLS:** Supabase Auth handles identity (JWT generation); Postgres RLS controls data authorization.
* **`authenticated` ≠ Authorized:** Scope policies to row ownership (`auth.uid() = user_id`) or explicit authorization checks. Avoid `TO authenticated` without a predicate.
* **Placeholder Risk:** `USING (true) WITH CHECK (true)` policies display as "RLS Enabled" in the Supabase dashboard but enforce zero security.

---

## 2. Phase 1: Audit (Read-Only)

> **Prompt for LLM:** Audit RLS setup on project `<project-ref>`, schema `<schema>`. Read-only mode - do **not** run DDL or migrations. Report findings and stop.

1. **REST Exposure:** Verify exposed schemas in Dashboard → Project Settings → API.
2. **Table RLS Status:** List all tables and check if RLS is enabled and forced.
3. **Policy Extraction:** Extract verbatim policies from `pg_policies` (table, name, command, roles, `USING`, `WITH CHECK`). Flag `true` predicates.
4. **Unprotected Tables:** Identify tables with RLS disabled, or RLS enabled with zero policies.
5. **Grants Audit:** Check table, sequence, and function grants, plus schema `USAGE` for `anon`, `authenticated`, and **`PUBLIC`**.
6. **Default Privileges:** Inspect `ALTER DEFAULT PRIVILEGES` on the schema for tables, sequences, and functions.
7. **Functions & RPCs:** Check `SECURITY DEFINER` vs `INVOKER`, `search_path` settings, and in-body authorization logic.
8. **Views:** Audit `security_invoker` settings and cross-schema view dependencies.
9. **Ownership Shape:** Check for `user_id` / `owner_id` columns referencing `auth.uid()`.
10. **Storage Buckets:** Audit `public` flags and all `storage.objects` policies.
11. **Advisors:** Run `get_advisors` for `security` and `performance` warnings.

**Audit Summary Goal:** Plainly answer: *If an attacker extracts the anon key and hits the REST API directly, what data can they read, insert, update, or delete?* (Include table names and row counts).

---

## 3. Critical Traps & Anti-Patterns

| Trap | Impact | Prevention / Fix |
| :--- | :--- | :--- |
| **`PUBLIC` Grants** | Functions granted to `PUBLIC` (`=X/postgres`) inherit to `anon`. `REVOKE FROM anon` alone fails. | Revoke from **`PUBLIC`** and `anon`, then grant explicitly to `authenticated`. |
| **Default Privileges** | `ALTER DEFAULT PRIVILEGES` granting `anon` auto-exposes newly created tables. | Reverse default grants for `anon` on the schema immediately. |
| **`SECURITY DEFINER` RPCs** | Bypasses table RLS completely and executes as the database owner. | Add explicit in-body checks (e.g., `auth.uid() = ...`) inside function bodies. |
| **Revoking `auth` Schema** | Broad `REVOKE ON ALL SCHEMAS` locks out GoTrue login endpoints. | Scope all revokes strictly to your target schema (`<schema>`). |
| **Public Storage Buckets** | `public = true` buckets bypass `storage.objects` RLS for direct object fetches. | Set `public = false` and use `createSignedUrl()`, or restrict `INSERT`/`UPDATE`/`DELETE` policies. |
| **Silent App Errors** | Frontend error catchers returning `[]` mask RLS silent filtering (`200 OK`). | Verify lockdown via database queries and curl status codes, not visual UI state. |
| **`TRUNCATE` Privileges** | `TRUNCATE` ignores RLS policies entirely if held by a role. | Limit grants to standard DML (`arwd`: SELECT, INSERT, UPDATE, DELETE). |
| **Unpinned `search_path`** | Missing `SET search_path = ''` exposes functions to search-path hijacking. | Pin `SET search_path = ''` on functions/triggers and test trigger execution. |

---

## 4. Fix Patterns

Determine the appropriate pattern based on audit findings (Audit Step 9).

### Pattern A: Per-User Ownership (Preferred)
Use when tables contain a `user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id)` column.

```sql
CREATE POLICY "Users access own rows" ON <schema>.<table>
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Pattern B: Single-User / Global Allowlist Gate
Use when tables lack an ownership column and backfilling is impractical.

```sql
-- 1. Helper function checking authorized UID (Prefer UID over email)
CREATE FUNCTION <schema>.is_authorized() RETURNS boolean
  LANGUAGE sql SECURITY DEFINER STABLE SET search_path = ''
AS $$ SELECT auth.uid() = '<authorized-uuid>'::uuid $$;

REVOKE EXECUTE ON FUNCTION <schema>.is_authorized() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION <schema>.is_authorized() TO authenticated;

-- 2. Scoped RLS Policy
CREATE POLICY "Authorized access only" ON <schema>.<table>
  FOR ALL TO authenticated
  USING (<schema>.is_authorized())
  WITH CHECK (<schema>.is_authorized());
```

---

## 5. Phase 2: Execution Checklist

Apply as a single database migration after reviewing Phase 1 output:

- [ ] Create helper function (if using Pattern B).
- [ ] Drop all permissive/placeholder (`true`) policies by exact table name and policy name.
- [ ] Create new policies scoped `TO authenticated` with explicit predicates.
- [ ] Revoke table/sequence privileges and schema `USAGE` from `anon`.
- [ ] Revoke function `EXECUTE` from **`PUBLIC`** and `anon`; grant to `authenticated`.
- [ ] Reverse `ALTER DEFAULT PRIVILEGES` for `anon`. Narrow `authenticated` defaults to `arwd`.
- [ ] Add authorization checks inside all `SECURITY DEFINER` function bodies.
- [ ] Pin `SET search_path = ''` on all functions and trigger functions.
- [ ] Scope storage policies across all four commands (`SELECT`, `INSERT`, `UPDATE`, `DELETE`).
- [ ] **Sanity Check:** Leave `service_role` untouched. Ensure no `service_role` keys exist in client code.
- [ ] **Anon Key Audit:** Confirm background scripts, CI steps, or SSR clients (`@supabase/ssr`) are not relying on unauthenticated anon grants before revoking.

---

## 6. Phase 3: Verification & Smoke Testing

1. **Impersonation Probe:** Run an anonymous test query in an aborted transaction. Expect `42501 permission denied`.
2. **Direct REST Probe:** Test endpoints with the anon key using `curl`:
   ```bash
   curl -i "https://<project-ref>.supabase.co/rest/v1/<table>?select=*&limit=5" \
     -H "apikey: <anon-key>" \
     -H "Authorization: Bearer <anon-key>" \
     -H "Accept-Profile: <schema>"
   ```
   *Expect `42501` / `Permission Denied` (or `200 []` if grants pass but RLS filters).*  
   *(Note: On Windows, pass `--ssl-no-revoke` if curl fails with exit code 35).*
3. **RPC Probes:** Call all `SECURITY DEFINER` functions anonymously and verify rejection.
4. **Advisor Audit:** Re-run `get_advisors` to confirm zero `rls_policy_always_true` findings remain.
5. **Trigger Check:** Confirm database triggers fire without `search_path` runtime errors.
6. **App Smoke Test:** Authenticate via the frontend and verify data loads with expected row counts.

---

## 7. Quick Reference

### HTTP Status Codes
| Status Code | Meaning | Security Status |
| :--- | :--- | :--- |
| `42501` | Permission denied at schema/grant layer | ✅ Blocked before table evaluation |
| `200 OK` with `[]` | Grants passed; RLS filtered out all rows | ✅ Access controlled |
| `200 OK` with rows | Data exposed via anon key | ❌ Vulnerable |

### Postgres Privilege Codes (ACL)
* `arwd`: `a` (INSERT), `r` (SELECT), `w` (UPDATE), `d` (DELETE) - **Target DML Scope**
* `Dxtm`: `D` (TRUNCATE), `x` (REFERENCES), `t` (TRIGGER), `m` (MAINTAIN) - **Avoid granting to app roles**
* `UXC`: `U` (USAGE), `X` (EXECUTE), `C` (CREATE)
* `=X/postgres`: ACL entry with an empty grantee indicates grant to **`PUBLIC`**.
