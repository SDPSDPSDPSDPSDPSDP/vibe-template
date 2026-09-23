# AI Startup & Project Scaffolding Guide

> Portable onboarding checklist and prompt template for bootstrapping a new project from the Vibe Template.
> **Note:** Once startup is finished on your side, explain to the user what manual steps they still need to complete (such as creating the Vercel project, setting up environment variables in Vercel, etc.). Only then remove `AI-startup-guide.md`.

---

## 1. Stack Profile Selection

Every new project starts from the core template baseline (icons, typography, docs, AGENTS.md, Supabase schema setup, and .gitignore). Select the project profile during bootstrapping:

* **Next.js / TypeScript Stack (Default Web App):**
  * Retain `src/`, `package.json`, `tsconfig.json`, `next.config.mjs`, `.eslintrc.json`, `next-env.d.ts`, and `worker/`.
* **Python Stack (Data Science / ML / Backend Service):**
  * Initialize Python config (`pyproject.toml` or `requirements.txt`).
  * Remove JS/TS frontend configs (`package.json`, `next.config.mjs`, `tsconfig.json`, `.eslintrc.json`, `worker/`) if no Node frontend is required.
  * Retain `AGENTS.md`, `docs/`, `public/` (icons & assets), `supabase/`, `.gitignore` (pre-configured for Python), `.env.example`.
* **Hybrid Stack (Next.js Frontend + Python Backend):**
  * Retain Next.js files in `src/` and place Python code in `api/` or `backend/`.

---

## 2. Pre-Flight Bootstrap Checklist

Before starting code generation for a new app:

1. **Select Supabase Project & Schema:**
   * Ask the user whether they want the Supabase schema created in the public or private Supabase project.
   * **Single-User App:** Target the private Supabase project. Define a dedicated schema (e.g. `closet`, `gratitude`) and set up a single-user RLS helper function.
   * **Multi-User App:** Target the public Supabase project. Define a dedicated schema and design row-level RLS (`auth.uid() = user_id`).
2. **Set Up Storage Bucket:**
   * Create a private Cloudflare R2 bucket.
   * Configure R2 CORS policy to allow `Access-Control-Allow-Origin` for canvas pixel sampling.
3. **Configure Cloudflare Worker (Optional/Recommended for Node stack):**
   * Update `worker/wrangler.toml` with `<app-name>-media`, `<r2-bucket-name>`, and `APP_ORIGIN`.
   * Deploy via `npx wrangler deploy` if using edge media streaming or hourly cron triggers.
4. **Configure Vercel Deployment Region:**
   * Pin function region in `vercel.json` (`"regions": ["dub1"]`) to match Supabase's region (`eu-west-1`).
   * Confirm in Vercel Dashboard (*Project Settings -> Functions -> Function Region*). Note that region updates require a new deployment to take effect.
5. **Update Project README.md:**
   * Fill in [README.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/README.md) with the new project's actual name, description, and overview.
6. **Configure Database Environment Details:**
   * Fill in [docs/DATABASE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/DATABASE.md) under `## 1. Project Environment & Supabase Config` with the target Supabase Project Ref, Region, URL, and Schema Name.
7. **Configure Environment Variables (`.env.local`):**
   * Copy [.env.example](file:///c:/Users/shiri/Code/Common/Vibe%20Template/.env.example) to `.env.local` and populate all required Supabase and Cloudflare R2 keys (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
8. **Verify Core Documentation & Assets:**
   * Ensure [AGENTS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/AGENTS.md) is present in the repository root.
   * Ensure [docs/ARCHITECTURE.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/ARCHITECTURE.md) and [docs/CODING-STANDARDS.md](file:///c:/Users/shiri/Code/Common/Vibe%20Template/docs/CODING-STANDARDS.md) are present.
   * Ensure placeholder SVG circle gradient icons (`icon.svg` in `src/app/`, `favicon.svg` in `public/`) and fonts are present in `public/fonts/`.

---

## 3. Scaffolding Prompt for LLM

When starting a new project in this repository, hand the following prompt to the AI agent:

```text
You are scaffolding a new app using the Vibe Template.

Before writing code:
1. Read AGENTS.md in the root directory for operational rules.
2. Read docs/ARCHITECTURE.md for infrastructure, R2 presigned URL patterns, and Supabase RLS requirements.
3. Read docs/CODING-STANDARDS.md for CSS design token rules and domain module patterns.
4. Ask the user whether they want the Supabase schema created in the public or private Supabase project.
5. Update README.md with the actual project name and description.
6. Update docs/DATABASE.md under "Project Environment & Supabase Config" with the target Supabase Project Ref, Region, URL, and Schema Name.
7. Create .env.local based on .env.example and populate the required Supabase and Cloudflare R2 credentials.

Target App Details:
- App Name: <app-name>
- Stack Profile: <nextjs | python | hybrid>
- Supabase Project Target: <public | private> (ask user if not specified)
- Audience Type: <single-user | multi-user>
- Schema Name: <schema-name>
- Primary Features: <feature-summary>

If Stack Profile is Python:
- Remove unneeded Node frontend config files (package.json, next.config.mjs, tsconfig.json, worker/) unless a Next.js frontend is used.
- Initialize pyproject.toml / requirements.txt and Python package structure.

Proceed to generate initial schema DDL, API route dispatcher / backend setups, and component shells adhering strictly to these docs.

Once startup is finished on your side, explain clearly to the user what manual steps they still need to complete (e.g. creating the Vercel project, setting up environment variables in Vercel, configuring third-party tokens). Only after explaining these steps should you remove `AI-startup-guide.md`.
```

---

## 4. Off-Ramp / Post-Launch Cleanup

Once startup and scaffolding are finished on your side:
1. **Explain to the user what manual steps they still need to perform** (e.g., create the Vercel project, set up environment variables in Vercel, configure production domain settings).
2. **Only then remove `AI-startup-guide.md`** from the root directory to keep the repository clean.
3. **Retain core documentation:** Keep `AGENTS.md`, `docs/ARCHITECTURE.md`, and `docs/CODING-STANDARDS.md` as living documentation.
