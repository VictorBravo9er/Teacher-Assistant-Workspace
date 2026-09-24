# Plan 11: Optimistic Student Roster Enrolment & Background Invitation Flow

> **Status**: ✅ **COMPLETED & VERIFIED**  
> **Target Subsystems**: `frontend/src/features/students/` (`StudentRegister.tsx`), `frontend/src/types/` (`main.ts`)

---

## 1. Context & Architectural Need

### 1.1 The Synchronous Enrolment Latency Problem
In Teach&Learn LMS, enrolling a student triggers the Supabase `invite-student` edge function. This function creates or looks up the auth user, generates secure tokens, writes to `class_students`, and dispatches an invitation email via Resend SMTP. This network and cryptographic pipeline typically takes 3 to 6 seconds to complete.

Previously:
- The teacher filled out the "Add New Student" modal and submitted it.
- The modal closed, but the roster UI showed **no visual change or feedback** for up to 5 seconds.
- If the browser or network connection experienced jitter or disconnection during that window, the teacher was left in uncertainty.
- Once the server finally responded, the system automatically opened the heavy `StudentDetailModal`, completely disrupting the teacher if they were attempting to invite multiple students sequentially.

---

## 2. Core Architectural Objectives

### 2.1 Non-Blocking Optimistic UI Insertion
- When the teacher clicks "Invite Student":
  1. A temporary UUID (`crypto.randomUUID()`) is assigned.
  2. A new `Student` record is constructed with `isPending: true`.
  3. The student card is immediately appended to the roster in local state.
  4. The modal closes without waiting for network I/O.

### 2.2 Client-Side Background Promise Resolution (Option A)
- Instead of blocking the UI or introducing complex SSE streaming overhead:
  - The request to `studentService.addStudentToClass(classItem.id, newStudent)` is dispatched as an asynchronous background promise.
  - A mutable `classItemRef` tracks latest classroom state, preventing race conditions or overwritten data if other edits occur concurrently.
  - **On Success**: The pending student card is updated with the real database `student_id` returned by the edge function, `isPending` is set to `false`, and a success toast confirms enrolment.
  - **On Error**: The optimistic card is cleanly evicted from the roster, and an error toast details the failure.

### 2.3 Animated Loading Overlay & Interaction Guard
- While `isPending` is `true`:
  - An animated loading overlay (`backdrop-blur`, spinning `Loader2`, and pulsing `"Inviting..."` badge) is rendered over the student card.
  - Click events on the pending card are disabled to prevent opening incomplete or unconfirmed dossiers.
  - Navigation controls (`previousStudent` / `nextStudent`) in adjacent modals exclude pending students.

### 2.4 Workflow Continuity (No Auto-Opened Dossier)
- Removing `setSelectedStudentId(realId)` upon completion keeps the teacher in the active roster context, enabling seamless batch additions.

---

## 3. Implementation Blueprint

### 3.1 Type Definition Update (`frontend/src/types/main.ts`)
```typescript
export interface Student {
  id: string;
  name: string;
  // ... other fields
  isPending?: boolean;
}
```

### 3.2 State & Reference Handling (`frontend/src/features/students/StudentRegister.tsx`)
```typescript
const classItemRef = useRef(classItem);
useEffect(() => {
  classItemRef.current = classItem;
}, [classItem]);

const handleAddNewStudent = (payload: { name: string; email: string }) => {
  if (!payload.name.trim() || !payload.email.trim()) return;
  const currentStudents = classItemRef.current.students;
  const roll = `M10-0${currentStudents.length + 1}`;
  const tempId = crypto.randomUUID();

  const newStudent: Student = {
    id: tempId,
    name: payload.name.trim(),
    rollNumber: roll,
    email: payload.email.trim(),
    phone: '',
    address: '',
    parentName: '',
    parentContact: '',
    parentNotes: '',
    performanceIndicator: 'good',
    statusIndicator: 'active',
    submissions: [],
    customFields: [
      { id: `cf-${Date.now()}-1`, label: 'Tutoring Status', type: 'tag', value: 'None', visibility: true },
      { id: `cf-${Date.now()}-2`, label: 'IEP Accommodation', type: 'boolean', value: 'false', visibility: true },
    ],
    avatarSeed: payload.name.trim().split(' ')[0] || 'Student',
    isPending: true,
  };

  const nextStudents = [...currentStudents, newStudent];
  classItemRef.current = { ...classItemRef.current, students: nextStudents };
  onUpdateClass(classItem.id, { students: nextStudents });

  studentService
    .addStudentToClass(classItem.id, newStudent)
    .then((realStudentId) => {
      const latestStudents = classItemRef.current.students;
      const updated = latestStudents.map((s) =>
        s.id === tempId ? { ...s, id: realStudentId || tempId, isPending: false } : s
      );
      classItemRef.current = { ...classItemRef.current, students: updated };
      onUpdateClass(classItem.id, { students: updated });
      notify(`Invitation sent to ${newStudent.name}!`);
    })
    .catch((e: unknown) => {
      logger.error('STUDENT_SERVICE', 'Failed to add student to class', e);
      const latestStudents = classItemRef.current.students;
      const rolledBack = latestStudents.filter((s) => s.id !== tempId);
      classItemRef.current = { ...classItemRef.current, students: rolledBack };
      onUpdateClass(classItem.id, { students: rolledBack });
      const errMsg = e instanceof Error ? e.message : String(e);
      notify(`Failed to invite ${newStudent.name}: ${errMsg}`);
    });
};
```

### 3.3 Visual Loading Overlay JSX
```tsx
{stud.isPending && (
  <div
    className="absolute inset-0 bg-background/80 backdrop-blur-[1.5px] z-10 flex flex-col items-center justify-center gap-1.5 p-2 animate-fade-in"
    title="Sending invitation and enrolling student..."
  >
    <Loader2 className="w-5 h-5 text-primary animate-spin" />
    <span className="text-[10px] font-mono font-medium text-primary tracking-wide animate-pulse">
      Inviting...
    </span>
  </div>
)}
```

---

## 4. Verification Plan

1. **Type Safety & Build Cleanliness**:
   - `npm run build` in `frontend/` (0 errors, strict type checking).
   - `uv run poe lint` in `backend/` (clean lint/type check).
2. **Behavioral Testing**:
   - Add student: card appears instantly in roster with "Inviting..." spinner overlay.
   - User detail modal does NOT pop up automatically.
   - Card clicks are disabled during pending state.
   - Upon background resolution, spinner dismisses cleanly and card becomes active.
