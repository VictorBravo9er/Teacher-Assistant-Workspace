# Static Data Dictionaries — `src/data/`

This directory provides static reference datasets, geographical administrative dictionaries, and localization constants used across forms and filter controls.

---

## 📁 Directory Files

- [`geography.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/data/geography.ts): Hierarchical dataset of countries, states/UTs, and administrative districts (including all 28 Indian states, 8 Union Territories, and ~780 districts), paired with location sanitization utilities (`sanitizeLocationInput`).

---

## 💡 Role in the Application

`src/data/` replaces redundant database RPC round-trips for static geographical divisions with zero-latency, type-safe client lookup tables.

For data schemas and cascading architecture, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/data/code.ARCH.md).
