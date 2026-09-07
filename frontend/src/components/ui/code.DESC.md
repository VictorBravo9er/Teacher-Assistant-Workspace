# Atomic UI Primitives — `src/components/ui/`

This directory provides the lowest-tier, domain-agnostic atomic design system primitives for the application.

---

## 📁 Directory Files

- [`Button.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/Button.tsx): Reusable button component supporting multiple color variants (`primary`, `secondary`, `outline`, `danger`, `ghost`), size variants (`sm`, `md`, `lg`), loading spinner state, and icon prefixes/suffixes.
- [`Badge.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/Badge.tsx): Status badge indicator supporting multiple color tiers (`success`, `warning`, `danger`, `info`, `neutral`) and optional dismissal buttons.
- [`Card.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/Card.tsx): Base container surface component with standard borders, rounded corners, hover elevations, and dark mode background tokens.
- [`Input.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/Input.tsx): Standard text and number input field wrapper with support for labels, helper text, error messages, and icon prefixes.
- [`Modal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/Modal.tsx): Accessible modal dialog primitive featuring backdrop blur, focus containment, ESC key dismiss handler, and header/body/footer structural slots.
- [`index.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/index.ts): Barrel export file centralizing all UI primitive exports for clean multi-import consumption.

---

## 💡 Role in the Application

These atomic components represent Tier 1 of the Tailwind Consolidation strategy, eliminating duplicated JSX utility classes across the application.

For prop interfaces, variant mappings, and accessibility details, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/ui/code.ARCH.md).
