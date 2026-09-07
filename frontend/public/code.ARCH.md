# Public Assets Architecture & Delivery

This document details the static asset delivery architecture for files located in `frontend/public/`.

---

## 1. Asset Pipeline & Delivery Model

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    PublicDir["frontend/public/ (*.svg)"] -->|Vite Build Copy| DistRoot["dist/ (*.svg)"]
    DistRoot -->|Nginx Static Mapping| Browser["Browser Client (GET /logo.svg)"]
```

### Key Architectural Invariants:
1. **Zero Transformation**: Files in this directory are static XML/SVG documents that are not processed or modified by TypeScript/PostCSS/Vite.
2. **Absolute Root Resolution**: Referenced across HTML (`index.html`) and components via root-relative URLs (`/logo.svg`, `/logo 3.svg`).
3. **Nginx Caching**: In production, Nginx serves these vector assets with appropriate `image/svg+xml` MIME types and cache headers.
