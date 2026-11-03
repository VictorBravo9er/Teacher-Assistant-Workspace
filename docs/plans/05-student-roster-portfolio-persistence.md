# Plan 05: Student Roster & Portfolio Persistence

> **Status**: ✅ **COMPLETED** (Full portfolio CRUD wired in `studentService.ts`, conditional gate removed in `StudentRegister.tsx`, verified with `npm run build`, `npm run lint`, and `uv run poe lint`)

## 1. Problem Statement & Root Cause
In [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx#L280-L365), teachers can view and edit student profiles, including:
- Phone number and home address
- Parent / Guardian name, contact details, and private notes
- Roll number
- Custom accommodations / IEP fields (`customFields`)

However, none of this data is ever saved to the database due to a two-tier failure:

### Failure Tier 1: Logic Guard in [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx#L114-L130)
```typescript
const handleUpdateStudentDetails = async (
  studentId: string,
  updatedFields: Partial<Student>
) => {
  // Updates local React state...
  setStudents((prev) => prev.map(...));

  // BUG: Only dispatches network request if performance indicator or submissions changed!
  if (updatedFields.performanceIndicator || updatedFields.submissions) {
    const student = updated.find((s) => s.id === studentId);
    if (student) {
      await studentService.updateStudentClassData(classItem.id, studentId, student);
    }
  }
};
```
When a teacher modifies a phone number, address, parent note, or accommodation, `updatedFields.performanceIndicator` is `undefined`. Consequently, `studentService.updateStudentClassData` **is never invoked**.

### Failure Tier 2: Omission in [`studentService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts)
Even if called:
1. `fetchStudentsForClass` does not query `phone`, `address`, `parent_name`, `parent_contact`, `parent_notes`, `custom_fields`, or `roll_number`.
2. `updateStudentClassData` does not include these attributes in its `.update({...})` payload.

When the teacher reloads the browser, all edits are lost.

---

## 2. Target Architecture
Following the schema migration in [Plan 01](./01-database-schema-alignment.md):
- `public.class_students` holds all class-scoped student portfolio data.
- `studentService.ts` queries and maps all columns between the PostgreSQL snake_case schema and the TypeScript camelCase domain interface (`Student`).
- `StudentRegister.tsx` unconditionally triggers persistence for any updated student attribute.

---

## 3. Implementation Steps

### Step 3.1: Verify Domain Model ([`frontend/src/types/main.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/types/main.ts))
Ensure `Student` contains all portfolio fields:
```typescript
export interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  rollNumber?: string;
  phone?: string;
  address?: string;
  parentName?: string;
  parentContact?: string;
  parentNotes?: string;
  customFields?: CustomField[];
  // ... existing performance and submission fields ...
}
```

### Step 3.2: Update Query & Updater in [`frontend/src/services/studentService.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/services/studentService.ts)
1. In `fetchStudentsForClass(classId: string)`:
   Update the query and row mapper to read portfolio columns:
   ```typescript
   return (data || []).map((cs: any) => {
     const student = cs.students;
     return {
       id: student.id,
       name: student.name,
       email: student.email,
       avatarUrl: student.avatar_url,
       rollNumber: cs.roll_number || '',
       phone: cs.phone || '',
       address: cs.address || '',
       parentName: cs.parent_name || '',
       parentContact: cs.parent_contact || '',
       parentNotes: cs.parent_notes || '',
       customFields: cs.custom_fields || [],
       // ... existing mapping for performanceIndicator, etc. ...
     } as Student;
   });
   ```

2. In `updateStudentClassData(classId: string, studentId: string, student: Student)`:
   Include all portfolio fields in the database update payload:
   ```typescript
   const { error } = await supabase
     .from('class_students')
     .update({
       roll_number: student.rollNumber,
       phone: student.phone,
       address: student.address,
       parent_name: student.parentName,
       parent_contact: student.parentContact,
       parent_notes: student.parentNotes,
       custom_fields: student.customFields || [],
       learning_style: student.performanceIndicator?.learningStyle,
       strengths: student.performanceIndicator?.strengths,
       weaknesses: student.performanceIndicator?.weaknesses,
       current_score: student.performanceIndicator?.currentScore,
       current_grade: student.performanceIndicator?.currentGrade,
       general_feedback: student.performanceIndicator?.generalFeedback,
       performance_tier: student.performanceIndicator?.performanceTier,
       behavioral_notes: student.performanceIndicator?.behavioralNotes,
     })
     .eq('class_id', classId)
     .eq('student_id', studentId);

   if (error) throw error;
   ```

### Step 3.3: Remove Conditional Gate in [`frontend/src/features/students/StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx)
Remove the restrictive `if (updatedFields.performanceIndicator || ...)` check so that any change (contact info, address, custom accommodations, or notes) triggers persistence:
```typescript
const handleUpdateStudentDetails = async (
  studentId: string,
  updatedFields: Partial<Student>
) => {
  const nextStudents = students.map((s) =>
    s.id === studentId ? { ...s, ...updatedFields } : s
  );
  setStudents(nextStudents);

  const updatedStudent = nextStudents.find((s) => s.id === studentId);
  if (updatedStudent) {
    try {
      await studentService.updateStudentClassData(classItem.id, studentId, updatedStudent);
    } catch (err) {
      console.error('Failed to persist student details:', err);
      // Optional: show toast notification on network failure
    }
  }
};
```

---

## 4. Verification Plan

### Automated Verification:
- Run `npm run build` in `frontend/` to ensure no interface discrepancies or missing properties.

### Manual Verification:
1. Open a class and navigate to the **Students** roster.
2. Select a student (e.g. "Liam Chen") to open [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx).
3. Fill in:
   - Roll Number: `CS-101-04`
   - Phone: `(555) 234-5678`
   - Address: `124 Maple Drive, Springfield`
   - Parent Name: `Margaret Chen`
   - Parent Contact: `m.chen@example.com`
   - Parent Notes: `Prefers email communication over phone calls.`
   - Custom Field: Add tag "Extended Test Time: 1.5x".
4. Close the modal and refresh the browser window (`Ctrl+F5`).
5. Re-open Liam Chen's student profile.
6. Verify that all fields retain their entered values without data loss.

---

## 5. Downstream Dependencies
- **Prerequisite**: [Plan 01 (`01-database-schema-alignment.md`)](./01-database-schema-alignment.md) must be executed first so the columns exist in PostgreSQL.
- **Enables**: [Plan 07 (`07-student-portal-architecture.md`)](./07-student-portal-architecture.md)
