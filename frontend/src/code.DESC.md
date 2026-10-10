# Frontend Application Root — `frontend/src/`

This directory contains the root client entrypoint, global stylesheet, and top-level component router for the Teach&Learn React application.

---

## 📁 Directory Files

- [`main.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/main.tsx): Client bootstrapping script that mounts the root React tree to DOM element `#root` wrapped in `React.StrictMode` and imports `index.css`.
- [`App.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/App.tsx): Root application orchestrator. Wraps the component tree with `AuthProvider`, manages authentication state transitions (Landing ➔ Auth ➔ ClassApp / StudentApp), and renders high-level views (`LandingPage`, `AuthPage`, `ClassApp`, `StudentApp`).
- [`index.css`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/index.css): Global Tailwind stylesheet using Tailwind v4 `@import "tailwindcss";`, custom theme color CSS variables (`--background`, `--surface`, `--elevated`, `--border-color`, `--primary`, `--primary-text`), custom scrollbar styles, and component utility classes (`.card-surface`, `.btn-primary`, `.input-field`).

---

## 💡 Role in the Application

`frontend/src/` provides the root foundation for state context providers, routing transitions, and global CSS design tokens.

For component hierarchy, state flow, and CSS architecture, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/code.ARCH.md).
