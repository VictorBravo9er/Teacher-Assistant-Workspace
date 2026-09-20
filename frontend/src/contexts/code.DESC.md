# React Context Providers — `src/contexts/`

This directory manages global application state providers and subscription listeners.

---

## 📁 Directory Files

- [`AuthContext.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/contexts/AuthContext.tsx): Provides authentication state and Supabase session management across the React component tree. Exposes `user`, `session`, `loading`, `signIn`, `signUp`, and `signOut` through the custom `useAuth()` hook.

---

## 💡 Role in the Application

`AuthContext` abstracts Supabase authentication and token synchronization away from UI components, offering a unified API for user authentication and authorization.

For session lifecycle, listener architecture, and auth state flow, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/contexts/code.ARCH.md).
