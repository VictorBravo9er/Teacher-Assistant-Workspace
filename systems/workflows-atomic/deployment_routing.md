# Atomic Workflows: Deployment Routing

This document defines the atomic deployment-routing task that lets the Vite SPA survive direct navigation and hard refreshes on any client-owned path.

---

## ATOM-DEP-01: Resolve a Direct SPA Route

### 1. Trigger

A browser issues a document request for a public path after a direct URL entry, page reload, or hard refresh. A path such as `/app` is only an example; no route is special-cased by this workflow.

### 2. Preconditions

- The Vercel deployment is built in Services mode with the `frontend` and `backend` services configured in the repository-level `vercel.json`.
- The frontend service has completed its Vite build and exposes `dist/index.html`.
- The frontend service has a service-level rewrite from `/(.*)` to `/index.html` and `cleanUrls` is disabled.
- The top-level `/api/:path*` rewrite appears before the frontend catch-all.

### 3. Input Parameters / Payload

```text
GET /<any-public-path>
```

There is no application payload. The request path and query string are preserved while Vercel selects the owning service and the frontend fallback serves the shell.

### 4. Execution Pipeline

1. Vercel evaluates the top-level rewrites in order.
2. If the path matches `/api/:path*`, the request is routed to the `backend` service and the FastAPI response is returned. The frontend fallback is not evaluated.
3. Otherwise, the request is routed to the `frontend` service with its original path.
4. The frontend service checks the built filesystem. Existing static assets (for example JavaScript, CSS, images, and fonts) are served directly.
5. If no built file matches the request path, the frontend service rewrite serves `dist/index.html` while keeping the browser URL unchanged.
6. React bootstraps from the shell, reads `window.location`, and renders the matching client-side view.

### 5. Error Handling & Boundaries

- A missing API route remains the backend's responsibility and must not fall through to the SPA.
- A missing frontend build artifact is a deployment/build failure; the SPA fallback cannot repair an absent `index.html`.
- A genuinely missing backend route returns the backend's own HTTP error.
- Static asset lookup remains ahead of the catch-all rewrite, preventing the HTML shell from replacing real assets.

### 6. Postconditions

- No database, storage, or authentication mutation occurs.
- The browser receives the SPA shell for client-owned paths that do not correspond to built files.
- The browser URL remains the originally requested route, allowing the client router to resolve it after bootstrap.

### 7. Conclusion & Re-render

Direct navigation and hard refresh produce the same client-routing lifecycle as in-app navigation. The deployment is considered correctly configured when an arbitrary client route returns the SPA shell rather than a Vercel not-found response, while `/api/*` requests continue to reach FastAPI.
