# Student Invitation Architecture & Roster Enrollment

This document details the student invitation workflow, permission checks, and enrollment mutations in `supabase/functions/invite-student/`.

---

## 1. Invitation & Enrollment Flow

```mermaid
sequenceDiagram
    autonumber
    participant Teacher as Instructor
    participant EdgeFunc as invite-student (index.ts)
    participant Auth as auth.ts (verifyUser)
    participant DB as Postgres (students / class_students)

    Teacher->>EdgeFunc: POST /functions/v1/invite-student { class_id, email, name, roll_number }
    EdgeFunc->>Auth: Extract caller user_id
    EdgeFunc->>DB: Verify caller is owner of class_id
    alt Not Class Owner
        EdgeFunc-->>Teacher: 403 Forbidden { error: "Only class owner can invite students" }
    else Owner Verified
        EdgeFunc->>DB: Upsert student record by email
        EdgeFunc->>DB: Insert class_students link
        EdgeFunc-->>Teacher: 200 OK { success: true, student_id, enrollment_id }
    end
```

---

## 2. Invariants & Multi-Tenant Boundaries

1. **Idempotent Student Upserts**:
   If a student with the provided email already exists globally under the teacher's profile, the existing record is reused and linked to the new class via `class_students`.
2. **Owner-Only Enforcement**:
   Enforces strict teacher-class ownership validation before any record creation or enrollment mutation occurs.
