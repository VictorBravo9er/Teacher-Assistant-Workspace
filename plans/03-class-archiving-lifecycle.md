# Plan 03: Class Archiving Lifecycle & State Standardization

## 1. Problem Statement & Root Cause
In Teach&Learn, teachers can archive completed or historical classes so they no longer clutter the active navigation sidebar. However, the current implementation silently fails to persist archiving to PostgreSQL and fails to filter archived classes in the UI due to property name divergence:

```
UI Action (useClassOperations.ts)   ──►  passes { archived: true }
                                                  │
                                                  ▼
Service Layer (classService.ts)     ──►  checks updates.isArchived
                                         (dbUpdates.is_archived NOT set!)
                                                  │
                                                  ▼
PostgreSQL Database                 ──►  Never updated (silent failure)
                                                  │
                                                  ▼
Sidebar Filter (Sidebar.tsx)        ──►  checks c.archived (undefined on fetched data)
                                         (Archived tab is always empty)
```

### Detailed Trace:
1. **`useClassOperations.ts`**:
   ```typescript
   const handleArchiveClass = async (id: string) => {
     const target = classes.find((c) => c.id === id);
     if (!target) return;
     // BUG: passes `archived` instead of `isArchived`
     await classService.updateClass(id, { archived: !target.archived });
   };
   ```
2. **`classService.ts`**:
   ```typescript
   if (updates.isArchived !== undefined) dbUpdates.is_archived = updates.isArchived;
   // `updates.archived` is ignored, so dbUpdates remains empty
   ```
3. **`Sidebar.tsx`**:
   ```typescript
   const activeClasses = classes.filter((c) => !c.archived);
   const archivedClasses = classes.filter((c) => c.archived);
   // On fetched data, `c.isArchived` is set by classService, while `c.archived` is undefined.
   // Consequently, archivedClasses is always [] and activeClasses contains everything.
   ```
4. **`frontend/src/types/main.ts`**:
   `ClassModel` has conflicting optional properties: `isArchived?: boolean;` and `archived?: boolean;`.

---

## 2. Standardization Architecture
In accordance with **Rule 2 (Single Source of Truth / DRY)** and **Rule 3 (Eliminate State Synchronization)**:
- Standardize on `isArchived` as the authoritative client-side property across all interfaces, hooks, services, and components.
- Standardize on `is_archived` on the database/Supabase layer.
- Ensure the service layer defensively accepts both during transition, but guarantees that `is_archived` is updated in PostgreSQL.

---

## 3. Implementation Steps

### Step 3.1: Clean Domain Interface ([`frontend/src/types/main.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/main.ts))
Deprecate the redundant `archived?: boolean;` property on `ClassModel`, keeping `isArchived?: boolean;` as the single canonical property.

### Step 3.2: Fix Hook Dispatch ([`frontend/src/hooks/useClassOperations.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/hooks/useClassOperations.ts))
Update `handleArchiveClass` to use `isArchived`:
```typescript
const handleArchiveClass = async (id: string) => {
  const target = classes.find((c) => c.id === id);
  if (!target) return;
  const nextStatus = !(target.isArchived ?? (target as any).archived);
  
  // Update local state immediately (optimistic UI)
  setClasses((prev) =>
    prev.map((c) => (c.id === id ? { ...c, isArchived: nextStatus } : c))
  );

  // Persist to Supabase
  await classService.updateClass(id, { isArchived: nextStatus });
};
```

### Step 3.3: Defensive Mapping in [`frontend/src/services/classService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/classService.ts)
Update `updateClass` to handle both canonical and legacy property calls defensively:
```typescript
const targetArchived = updates.isArchived !== undefined 
  ? updates.isArchived 
  : (updates as any).archived;

if (targetArchived !== undefined) {
  dbUpdates.is_archived = targetArchived;
}
```
And ensure `fetchClasses` returns:
```typescript
isArchived: Boolean(row.is_archived),
```

### Step 3.4: Fix Filtering in [`frontend/src/components/layout/Sidebar.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/components/layout/Sidebar.tsx)
Update class tab partitioning:
```typescript
const activeClasses = classes.filter((c) => !(c.isArchived ?? (c as any).archived));
const archivedClasses = classes.filter((c) => Boolean(c.isArchived ?? (c as any).archived));
```

---

## 4. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to confirm that removing/updating `isArchived` across components causes no compile errors.

### Manual Verification:
1. In the application sidebar, identify an active class (e.g. "Physics 101").
2. Open class actions or class details and click **Archive Class**.
3. Verify that "Physics 101" disappears from the "Active Classes" list and moves to the "Archived" tab.
4. Hard-refresh the browser (`Ctrl+F5`).
5. Verify that "Physics 101" remains in the "Archived" tab (confirming PostgreSQL `is_archived = true` persistence).
6. Click **Unarchive Class** and verify it returns to the active list and remains active on reload.

---

## 5. Downstream Dependencies
- **Affects**: Sidebar navigation, class selection, and class list filtering.
