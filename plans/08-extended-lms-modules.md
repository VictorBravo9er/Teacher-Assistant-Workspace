# Plan 08: Extended LMS Modules — Announcements & Academic Calendar

## 1. Scope & Overview
While Plans 01 through 07 address database integrity, bug fixes, portfolio persistence, and the core Student Portal, this plan outlines two extended LMS modules that elevate Teach&Learn to a fully-fledged learning environment:
1. **Course Announcements & Notice Board**: Broadcast updates, syllabus changes, and urgent notifications to enrolled students.
2. **Academic Calendar & Schedule View**: An interactive schedule aggregating assignment deadlines (`materials.due_at`), attendance sessions (`attendance_records`), and class milestones.

---

## 2. Module 1: Course Announcements Feed

### 2.1 Database Schema Definition
```sql
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index foreign keys and sorting columns for multi-tenant query performance
CREATE INDEX IF NOT EXISTS idx_announcements_class_id ON public.announcements(class_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);

-- RLS: Teachers can manage, enrolled students can read
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage class announcements"
    ON public.announcements FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.classes 
        WHERE classes.id = announcements.class_id AND classes.user_id = auth.uid()
    ));

CREATE POLICY "Enrolled students read class announcements"
    ON public.announcements FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.class_students 
        WHERE class_students.class_id = announcements.class_id AND class_students.student_id = auth.uid()
    ));
```

### 2.2 UI Components
- **Teacher View**: "Post Announcement" form in [`ClassDetails.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/classroom/ClassDetails.tsx) with markdown editor and "Pin to Top" toggle.
- **Student View**: Announcement notification cards in [`StudentDashboard.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/StudentApp.tsx) with unread badges, pin indicators, and timestamp formatting.

---

## 3. Module 2: Interactive Academic Calendar

### 3.1 Aggregation Architecture
Rather than maintaining a separate event table, the Academic Calendar dynamically aggregates existing domain events:
- **Assignment Deadlines**: From `public.materials` where `due_at IS NOT NULL`.
- **Attendance Records**: From `public.attendance_records` grouped by `class_id` and `date`.
- **Custom Milestones**: Major exam dates and term holidays.

### 3.2 UI Component
Create `CalendarView.tsx`:
- Monthly / Weekly / Agenda view toggle.
- Color-coded badges for:
  - Red: Homework Due Date
  - Green: Regular Class Session
  - Amber: Exam / Milestone
- Filtering by class / course.

---

## 4. Verification Plan

### Automated Verification:
- Add unit tests for date calculation and announcement RLS query constraints.
- Run `npm run build` to verify calendar and announcement components.

### Manual Verification:
1. **Announcement Creation**:
   - Teacher creates a pinned announcement: "Midterm Exam rescheduled to next Friday."
   - Verify announcement appears in the teacher's class announcement tab.
2. **Student Portal Feed**:
   - Student logs into Student Portal and verifies the announcement appears at the top of the feed with an urgent pin badge.
3. **Academic Calendar**:
   - Open Academic Calendar and verify the midterm exam appears on next Friday's schedule cell.

---

## 5. Downstream Dependencies
- **Depends on**: Completion of Plans 01–07.
- **Companion**: Automated email delivery, delivery logs, and bounce alerts for announcements, materials, and student submissions are handled in [Plan 08.5 (`08.5-classroom-notifications-resend.md`)](./08.5-classroom-notifications-resend.md).
