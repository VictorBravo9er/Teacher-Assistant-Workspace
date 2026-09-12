# Authentication Context Architecture

This document details the authentication state flow, Supabase session lifecycle, and hook contracts in `frontend/src/contexts/`.

---

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
    AuthContext->>AuthContext: Set user, session, loading=false
    AuthContext->>Supabase: supabase.auth.onAuthStateChange(callback)
    Supabase-->>AuthContext: Emit SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED
    AuthContext->>AuthContext: Update state (user, session)
    Views->>AuthContext: useAuth()
    AuthContext-->>Views: { user, session, loading, signIn, signUp, signOut }
```

---

## 2. Key Architectural Invariants

1. **Strict Context Guard**:
   `useAuth()` throws a descriptive error if invoked outside an `<AuthProvider>` ancestor, preventing undefined context bugs during testing or rendering.
2. **Session Persistence**:
   Relies on Supabase client's underlying browser storage adapter (localStorage) to transparently preserve JWT tokens between page reloads.
3. **Single Source of Truth**:
   The `onAuthStateChange` subscription guarantees that login, logout, and token expiration events propagate immediately throughout the component tree without manual page reloads.
