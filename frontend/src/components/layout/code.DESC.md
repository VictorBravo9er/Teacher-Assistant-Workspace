# Layout Components — `src/components/layout/`

This directory provides high-level workspace navigation rails, global sidebar menus, and quick-action overlay controls.

---

## 📁 Directory Files

- [`Sidebar.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/layout/Sidebar.tsx): Primary left-hand application navigation sidebar. Manages active classes list, archived classes toggle, teacher templates list, search filtering, template creation/deletion, class creation modals, user profile display, and theme switcher buttons. Supports expanded and collapsed icon-only rail modes.
- [`CommandPalette.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/layout/CommandPalette.tsx): Global spotlight command palette triggered via keyboard shortcut (`Ctrl + K` / `Cmd + K`). Provides fuzzy search filtering to instantly navigate between classes, templates, view modes, and settings actions.

---

## 💡 Role in the Application

Layout components manage top-level navigation context and global keyboard triggers across the teacher workspace.

For state binding, keyboard listener lifecycles, and layout contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/layout/code.ARCH.md).
