# Frontend Subsystem — React 18 / Vite / TypeScript

This directory contains the root configuration, build toolchain, containerization, and static hosting definitions for the **Teach&Learn** React frontend web application.

For the end-user feature manual and classroom workflows, refer to [`USER_GUIDE.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/USER_GUIDE.md).

---

## 📁 Directory Files

- [`package.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/package.json): Defines frontend project dependencies (React 18, `@supabase/supabase-js`, `lucide-react`, `tailwindcss`, `vite`, `clsx`, `tailwind-merge`) and lifecycle scripts (`dev`, `build`, `preview`).
- [`package-lock.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/package-lock.json): Deterministic dependency lockfile ensuring reproducible package installations.
- [`vite.config.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/vite.config.ts): Vite build configuration setting up React plugin, environment prefix bindings, development server port bindings, and build output directories.
- [`tsconfig.json`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/tsconfig.json): TypeScript configuration enforcing strict mode (`"strict": true`), JSX transform, path aliases, and module resolution rules.
- [`index.html`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/index.html): HTML entrypoint template containing meta headers, title, favicon link, and the root `<div id="root"></div>` mounting tag.
- [`Dockerfile`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/Dockerfile): Multi-stage Docker build that compiles TypeScript/React into static assets using Node.js, validates extraction via Busybox, and deploys to a rootless Nginx unprivileged web server (`USER 1000:1000`) on port 80.
- [`default.conf.template`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/default.conf.template): Nginx configuration template providing SPA fallback routing (`try_files $uri $uri/ /index.html;`), gzip compression, and security headers.
- [`UI_ELEMENT_IDS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/UI_ELEMENT_IDS.md): Comprehensive inventory of all unique `id` attributes assigned to interactive UI elements for automated testing and DOM selection.
- [`AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/AGENTS.md): Frontend-specific engineering rules, component design principles, Tailwind CSS consolidation tiers, and accessibility standards.
- [`USER_GUIDE.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/USER_GUIDE.md): End-user documentation detailing classroom management, rubric grading, RAG diagnostics, and UI workflows.
- [`.env.example`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/.env.example): Frontend environment variable template documenting `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and backend API base URL.
- [`.dockerignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/.dockerignore): Excludes `node_modules`, build output `dist`, and environment files from container builds.
- [`.gitignore`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/.gitignore): Excludes build artifacts and local development overrides.

---

## 🚀 Development & Build

```bash
# Install dependencies
npm install

# Start development server with HMR
npm run dev

# Run TypeScript compilation and production bundle build
npm run build
```

For container build stages, Nginx routing patterns, and asset delivery architecture, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/code.ARCH.md).
