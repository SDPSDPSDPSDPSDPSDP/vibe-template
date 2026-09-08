# AI Startup & Project Scaffolding Guide

> Portable onboarding checklist and prompt template for bootstrapping a new project from the Vibe Template.
> **Note:** Once a project is scaffolded and launched, this file can be deleted from the repo.

---

## 1. Pre-Flight Bootstrap Checklist

Before starting code generation for a new app:

1. **Select Supabase Project & Schema:**
   * **Single-User App:** Target the private Supabase project. Define a dedicated schema (e.g. `closet`, `gratitude`) and set up a single-user RLS helper function.
   * **Multi-User App:** Target the public Supabase project. Define a dedicated schema and design row-level RLS (`auth.uid() = user_id`).
2. **Set Up Storage Bucket:**
   * Create a private Cloudflare R2 bucket.
   * Configure R2 CORS policy to allow `Access-Control-Allow-Origin` for canvas pixel sampling.
3. **Configure Cloudflare Worker (Optional/Recommended):**
   * Update `worker/wrangler.toml` with `<app-name>-media`, `<r2-bucket-name>`, and `APP_ORIGIN`.
   * Deploy via `npx wrangler deploy` if using edge media streaming or hourly cron triggers.
4. **Configure Vercel Deployment Region:**
   * Pin function region in `vercel.json` (`"regions": ["dub1"]`) to match Supabase's region (`eu-west-1`).
   * Confirm in Vercel Dashboard (*Project Settings -> Functions -> Function Region*). Note that region updates require a new deployment to take effect.
5. **Update Project README.md:**
   * Fill in [README.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/README.md) with the new project's actual name, description, and overview.
6. **Configure AGENTS.md Environment Details:**
   * Fill in [AGENTS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/AGENTS.md) under `## 2. Project Environment & Supabase Config` with the target Supabase Project Ref, Region, URL, and Schema Name.
7. **Configure Environment Variables (`.env.local`):**
   * Copy [.env.example](file:///c:/Users/shiri/Code/Common/Vibe%20Template/.env.example) to `.env.local` and populate all required Supabase and Cloudflare R2 keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
8. **Verify Core Documentation:**
   * Ensure [AGENTS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/AGENTS.md) is present in the repository root.
   * Ensure [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md) and [docs/CODING-STANDARDS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md) are present.

---

## 2. Scaffolding Prompt for LLM

When starting a new project in this repository, hand the following prompt to the AI agent:

```text
You are scaffolding a new app using the Vibe Template.

Before writing code:
1. Read AGENTS.md in the root directory for operational rules.
2. Read docs/ARCHITECTURE.md for infrastructure, R2 presigned URL patterns, and Supabase RLS requirements.
3. Read docs/CODING-STANDARDS.md for CSS design token rules and domain module patterns.
4. Update README.md with the actual project name and description.
5. Update AGENTS.md under "Project Environment & Supabase Config" with the target Supabase Project Ref, Region, URL, and Schema Name.
6. Create .env.local based on .env.example and populate the required Supabase and Cloudflare R2 credentials.

Target App Details:
- App Name: <app-name>
- Audience Type: <single-user | multi-user>
- Schema Name: <schema-name>
- Primary Features: <feature-summary>

Proceed to generate initial schema DDL, API route dispatcher setups, and component shells adhering strictly to these docs.
```

---

## 3. Off-Ramp / Post-Launch Cleanup

Once the application is scaffolded, verified, and deployed:
* **Delete `AI-startup-guide.md`** from the root directory to keep the repository clean.
* Retain `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/CODING-STANDARDS.md` as living documentation.
