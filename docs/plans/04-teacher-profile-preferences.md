# Plan 04: Teacher Profile & Teaching Preferences Persistence

> **Priority**: `LOW` (Cosmetic & Settings Polish)  
> **Status**: ✅ **COMPLETED** (Bound Profile and Preferences modals to Supabase `user_metadata` via `AuthContext.updateUserMetadata`, wired configurable `lateAttendanceWeight`, and verified with `npm run build`, `npm run lint`, and `uv run poe lint`)

## 1. Problem Statement & Root Cause
In [`frontend/src/features/account/AccountModals.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/AccountModals.tsx), the account profile and teaching preferences dialogs are completely detached from authentication state:
- **Hardcoded Profile Data**: Name is hardcoded to `"Elena Rostova"`, email to `"Vikramjitborah@gmail.com"`, role to `"AI Studio District Senior Educator"`, and affiliation to `"High School STEM faculty"`.
- **Mock Preferences Handler**: The "Teaching Preferences" modal (Remedial Trigger Threshold, Socratic Dialogue Verbosity, Feedback Tone) has internal state, but clicking "Save Preferences" simply shows a brief transient toast:
  ```typescript
  // No Supabase or database call occurs!
  setShowToast(true);
  setTimeout(() => onClose(), 800);
  ```
- **Disconnected from Supabase**: The components do not read from or dispatch updates to the active Supabase session managed by [`AuthContext.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/contexts/AuthContext.tsx).

---

## 2. Architectural Decision: Native Supabase `user_metadata`
In earlier iterations, creating an explicit `user_profiles` or `teachers` table was considered. However, adhering to **Rule 3 (Codebase Simplification & Structural Size Reduction)**:
- **Redundant Abstraction**: Creating a separate table requires new migration scripts, foreign keys, RLS security policies, and synchronization triggers.
- **Native Solution**: Supabase Auth provides a secure, built-in JSON metadata store on `auth.users`:
  - `auth.users.user_metadata` can be directly read via `supabase.auth.getUser()`.
  - It can be updated from the client via:
    ```typescript
    await supabase.auth.updateUser({
      data: {
        full_name: 'Dr. John Doe',
        phone: '+1-555-0199',
        affiliation: 'Science Department',
        title: 'Senior Chemistry Instructor',
        preferences: {
          remedialThreshold: 65,
          socraticVerbosity: 'Detailed',
          defaultFeedbackTone: 'Encouraging',
        }
      }
    });
    ```
- **Role Inversion Rule**: A user is a Student if `auth.uid() IN (SELECT id FROM public.students)` or `user_metadata.role === 'student'`. Otherwise, the user is an Educator.

---

## 3. Implementation Steps

### Step 3.1: Expose Update Method in [`frontend/src/contexts/AuthContext.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/contexts/AuthContext.tsx)
Add an `updateUserMetadata` helper to `AuthContext`:
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: 'teacher' | 'student' | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<void>;
}
```
Implementation:
```typescript
const updateUserMetadata = async (data: Record<string, any>) => {
  const { error } = await supabase.auth.updateUser({ data });
  if (error) throw error;
  // Refresh local user state
  const { data: { user: updatedUser } } = await supabase.auth.getUser();
  setUser(updatedUser);
};
```

### Step 3.2: Wire Profile Data in [`frontend/src/features/account/AccountModals.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/AccountModals.tsx)
1. In `AccountProfileModal`:
   - Initialize fields from `user?.user_metadata`:
     - `fullName`: `user?.user_metadata?.full_name || user?.email?.split('@')[0] || ''`
     - `email`: `user?.email || ''` (read-only)
     - `phone`: `user?.user_metadata?.phone || ''`
     - `affiliation`: `user?.user_metadata?.affiliation || 'General Faculty'`
     - `title`: `user?.user_metadata?.title || 'Educator'`
   - On save:
     ```typescript
     await updateUserMetadata({
       full_name: fullName,
       phone,
       affiliation,
       title,
     });
     ```

2. In `PreferencesModal`:
   - Initialize preferences from `user?.user_metadata?.preferences || defaultPreferences`:
     - `remedialThreshold`: percentage value (e.g. `70`)
     - `socraticVerbosity`: `'Concise' | 'Standard' | 'Detailed'`
     - `feedbackTone`: `'Encouraging' | 'Academic' | 'Rigorous'`
     - `lateAttendanceWeight`: number between 0 and 1 (default `0.5` = `50%`)
   - Provide interactive form controls including a dropdown for Late Attendance Weight:
     - `0%` (Counted as Absent)
     - `25%` (Minor credit)
     - `50%` (Half credit — Standard Default)
     - `75%` (Generous credit)
     - `100%` (Counted as Present)
   - On save:
     ```typescript
     await updateUserMetadata({
       preferences: {
         remedialThreshold,
         socraticVerbosity,
         feedbackTone,
         lateAttendanceWeight,
       }
     });
     ```

---

## 4. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to ensure no typing or context signature mismatches.

### Manual Verification:
1. Log in as an educator.
2. Click the user avatar in the sidebar footer and open **Profile & Account**.
3. Change the name to "Professor Jane Doe", affiliation to "Department of Biology", and enter a phone number.
4. Click **Save Changes**.
5. Refresh the page (`F5`).
6. Re-open **Profile & Account** and verify that the updated name and affiliation are displayed.
7. Open **Teaching Preferences**, change the Remedial Trigger to `80%`, save, reload, and confirm `80%` persists.

---

## 5. Downstream Dependencies
- **Relates to**: User avatar and name displays in `Sidebar.tsx` and header components.
