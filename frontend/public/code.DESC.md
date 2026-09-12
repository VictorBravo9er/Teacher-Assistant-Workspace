# Frontend Public Assets — `frontend/public/`

This directory stores static, unbundled assets served directly by the web server at the application root URL path.

---

## 📁 Directory Files

- [`logo.svg`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/public/logo.svg): Primary brand logo vector image featuring the Teach&Learn owl emblem, utilized in navigation headers, authentication cards, and metadata links.
- [`logo 3.svg`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/public/logo%203.svg): Alternate compact brand mark graphic used for favicon and collapsed sidebar icons.

---

## 💡 Role in the Application

Files in this directory bypass the Vite JavaScript bundling pipeline and are copied verbatim to the build output root (`dist/`), accessible directly via `/logo.svg` and `/logo 3.svg`.

For asset serving mechanisms and browser caching specifics, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/public/code.ARCH.md).
