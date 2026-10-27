# React Context Providers — `src/contexts/`

This directory manages global application state providers and subscription listeners.

---

## 📁 Directory Files

- [`AuthContext.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/contexts/AuthContext.tsx): Provides authentication state and Supabase session management across the React component tree. Exposes `session`, `user`, `role`, `isInitializing`, `signOut`, and `updateUserMetadata` through the custom `useAuth()` hook.

---

## 💡 Role in the Application

`AuthContext` abstracts Supabase authentication and token synchronization away from UI components, offering a unified API for user authentication and authorization.


---

## 🏛️ Architecture & Data Flow

## 1. Authentication Lifecycle & State Synchronization

```mermaid
sequenceDiagram
    autonumber
    participant App as App.tsx (Root)
    participant AuthContext as AuthProvider
    participant Supabase as Supabase Client (lib/supabase.ts)
    participant Views as Child Views / Hooks

    App->>AuthContext: Mount AuthProvider
    AuthContext->>Supabase: supabase.auth.getSession()
    Supabase-->>AuthContext: Return initial session
    AuthContext->>AuthContext: Set user, session, role, isInitializing=false
    AuthContext->>Supabase: supabase.auth.onAuthStateChange(callback)
    Supabase-->>AuthContext: Emit SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
    AuthContext->>AuthContext: Update state (user, session, role)
    Views->>AuthContext: useAuth()
    AuthContext-->>Views: { session, user, role, isInitializing, signOut, updateUserMetadata }
```

---

## 2. Key Architectural Invariants

1. **Strict Context Guard**:
   `useAuth()` throws a descriptive error if invoked outside an `<AuthProvider>` ancestor, preventing undefined context bugs during testing or rendering.
2. **Session Persistence**:
   Relies on Supabase client's underlying browser storage adapter (localStorage) to transparently preserve JWT tokens between page reloads.
3. **Single Source of Truth**:
   The `onAuthStateChange` subscription guarantees that login, logout, and token expiration events propagate immediately throughout the component tree without manual page reloads.
