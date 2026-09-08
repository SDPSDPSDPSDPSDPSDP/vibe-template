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
* **Name for Role, Not Scale:** Name typography utility classes based on UI role (`.closet-item-card-name`) rather than abstract size (`.type-body-medium`).
* **CSS Module Composition:** Import shared typography rules into component CSS using CSS module composition:
  ```css
  .itemName {
    composes: closet-item-card-name from global;
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

## 5. UI Loading States

* **Shimmer Skeletons over Spinners:** Use content-shaped skeleton placeholders rather than generic loading spinners.
* **Shimmer Animation Standard:** Apply a slow (~2s sweep) animated shimmer effect across a shared CSS class.
* **Accessibility:** Respect `prefers-reduced-motion` by disabling shimmer animations.
* **Static Fallbacks:** Only use static skeletons when handing off to a nested loading shell to prevent visual animation restarting glitches.
