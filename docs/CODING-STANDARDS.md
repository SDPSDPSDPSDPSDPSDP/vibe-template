# Coding Standards & Conventions

> Code structure, CSS design token system, domain logic patterns, and UI standards.

---

## 1. File Organization & Component Structure

* **Folder Nesting over Code Nesting:** Prefer small, single-responsibility files nested in clear folder hierarchies rather than large, monolithic files.
  * *Example:* `components/ui/feedback/Skeleton/Skeleton.tsx` with a co-located `Skeleton.module.css`.
* **Flat File Internals:** Keep logic inside each individual component or module flat and simple.

---

## 2. CSS Design Tokens & Typography

### Single Source of Truth
All visual attributes (color, border-radius, spacing, elevation/shadows, z-index) must be defined in central token files:
* `src/styles/global/tokens.css`
* `src/styles/global/typography.css`

### Strict Token Rule
* **Never hardcode raw visual values** (e.g. `#1a1a1a`, `16px`, `12px 24px`) in component styles or inline code.
* Always consume token variables using `var(--token-name)`. If a required value is missing, add the token to `tokens.css` first.

### Role-Based Typography & CSS Composition
* **Semantic, Role-Driven Naming:** Use semantic, business-logic-driven names for all typography utility classes — not abstract scale names like `.type-body-medium` or `.type-caption`. Names must reflect the actual UI role in the app domain (e.g. `.<app>-entry-text`, `.<app>-field-label`, `.<app>-section-heading`).
* **The Guiding Question:** When adding a new text style, ask: *"What is this text FOR in the app?"* and name it accordingly.
* **CSS Module Composition:** Import shared typography rules into component CSS using CSS module composition:
  ```css
  .itemName {
    composes: <app>-item-card-name from global;
    color: var(--color-text-primary);
  }
  ```

---

## 3. Domain Rules as Named Modules

* **Isolated Business Logic:** Encapsulate recurring domain rules (e.g., item classification, wear-count calculation) into standalone modules under `src/lib/domain/`.
* **Database Alignment:** Mirror domain rules in Postgres views or RPC functions whenever SQL queries need to evaluate the exact same business logic, ensuring app and database logic do not drift.

---

## 4. Code Commenting Policy

* **Minimal Commenting:** Keep comments to an absolute minimum.
* **Self-Explaining Code:** Omit comments that describe *what* code does. Write clear variable and function names instead.
* **Rationales Only:** Reserve comments exclusively for explaining non-obvious *why* rationale, workaround explanations, or external API quirks.

---

## 5. Error Handling & Fallbacks Policy

* **No Silent Fallbacks — Always Fail Hard:** Never swallow errors or return dummy fallback values (e.g. empty arrays `[]`, default objects, or silent 0-byte buffers) to mask underlying failures. If a query, function, or API call fails, allow it to fail hard so defects are immediately visible and debuggable.
* **Strict Environment Variables (No Inline Fallbacks):** Never write inline fallback defaults for environment variables (e.g. `process.env.VAR || 'fallback'`). Environment variables must either be explicitly set in the environment or fail hard immediately if missing. Additional environments or variable branches will be configured explicitly when requested.
* **User Request Exception:** Implement fallback logic **only** when the user explicitly requests a fallback for a specific feature or UI state.

---

## 6. UI Loading States

* **Shimmer Skeletons over Spinners:** Use content-shaped skeleton placeholders rather than generic loading spinners.
* **Shimmer Animation Standard:** Apply a slow (~2s sweep) animated shimmer effect across a shared CSS class.
* **Accessibility:** Respect `prefers-reduced-motion` by disabling shimmer animations.
* **Static Fallbacks:** Only use static skeletons when handing off to a nested loading shell to prevent visual animation restarting glitches.

---

## 7. Structured Diagnostics & Server-Side Logging

* **Server Log-Rich Design for AI Autonomy:** Emit comprehensive, structured server-side logs (`console.error`, `console.warn`, `console.info`) inside API routes, dispatcher handlers, and serverless functions. Include request parameters, validation details, database operation statuses, and full exception stack traces.
* **Autonomous AI Debugging:** AI coding agents query server runtime logs directly via log tools (Vercel runtime logs, Supabase log queries) but cannot inspect client-side browser DevTools. Server-side logging empowers AI agents to debug and resolve errors independently without prompting the user to copy-paste browser logs.
* **Informative API Error Payloads:** Never obscure API errors. Return structured diagnostic JSON responses (e.g., `{ error: "Presigned URL generation failed", details: error.message, route: "upload" }`) so network responses provide immediate, actionable context.
