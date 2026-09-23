# Coding Standards & Conventions

Essential code structure, design tokens, domain logic, and UI conventions.

---

## 1. Component Architecture & Organization

* **`src/components/ui/`:** Domain-agnostic primitives (buttons, modals, tooltips). Controlled purely via generic props. Never import domain models or database schemas.
* **`src/components/domain/`:** Feature components aware of app models and business logic. Compose generic primitives from `src/components/ui/`.
* **Component Splitting & Co-location:** When a component grows, split sub-components into a kebab-case folder containing the parent, children, and style module together:
  ```
  control-panel/
    ControlPanel.tsx
    CornerControls.tsx
    ControlPanel.module.css
  ```
* **Extract Hooks:** Put reusable business state into `src/lib/domain/use*.ts` and generic utility hooks into `src/lib/use*.ts`.

---

## 2. CSS Design Tokens & Typography

* **Central Tokens:** Define all visual values in `src/styles/global/` (`colors.css`, `tokens.css`, `typography.css`, `fonts.css`).
* **Zero Hardcoded Values:** Never use raw hex colors, pixel sizes, margins, or padding. Reference tokens via `var(--token-name)`.
* **Text Opacity Rule:** Never use solid hex greys for text. Use alpha transparent white/black (e.g., `rgba(255, 255, 255, 0.96)`, `rgba(255, 255, 255, 0.5)`) for seamless blending across cards and overlays.
* **Role-Based Typography:** Name utility classes after UI roles (e.g., `.<app>-entry-title`, `.<app>-field-label`), not abstract scales. Compose them in CSS modules (`composes: <app>-entry-title from global;`).

---

## 3. Domain Logic & Business Rules

* **Isolated Modules:** Place pure calculations and business rules in `src/lib/domain/`.
* **Database Alignment:** Mirror complex rules in Postgres views or RPC functions when queries require identical evaluation.

---

## 4. Error Handling & Fail Hard Policy

* **Fail Hard:** Never swallow errors or return dummy fallbacks (`[]`, `{}`). Unhandled errors must throw explicitly.
* **Strict Environment Variables:** Never use inline fallbacks (e.g., `process.env.KEY || 'default'`). Fail hard immediately if required variables are missing.
* **Fallbacks Exception:** Implement fallback logic only when explicitly requested by user.

---

## 5. UI Loading States

* **Shimmer Skeletons:** Use content-shaped skeleton placeholders instead of generic spinners.
* **Animation:** Use a smooth ~2s sweep animation. Respect `prefers-reduced-motion`.

---

## 6. Server Diagnostics & Logging

* **AI Autonomy via Logs:** Emit structured server-side logs (`console.error`, `console.warn`) with request params, validation failures, and full stack traces on all API routes. AI debugs via server logs, not browser DevTools.
* **Actionable Error Payloads:** Return structured JSON error objects (e.g., `{ error: "Upload failed", details: error.message }`) instead of generic status strings.

---

## 7. Comments Policy

* **Minimal Comments:** Never explain what code does. Use clear naming instead.
* **Why, Not What:** Reserve comments exclusively for non-obvious rationale, workarounds, or external API constraints.
