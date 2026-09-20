# Student Management Feature Module — `src/features/students/`

This directory provides components for managing the student roster, inspecting student portfolios, uploading submissions, evaluating rubrics, logging attendance, and generating parent report cards.

---

## 📁 Directory Files

- [`StudentRegister.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentRegister.tsx): The student roster view displaying enrolled students in responsive cards with attendance percentages, current grades, performance indicators, and enrollment modal triggers.
- [`StudentDetailModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentDetailModal.tsx): Comprehensive student portfolio modal displaying contact info, learning styles, strengths/weaknesses, custom fields, assignment history, and parent notes.
- [`SubmissionGradingModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/SubmissionGradingModal.tsx): Multi-channel submission review modal for evaluating student work against grading criteria, inputting point scores, writing public student feedback, and noting private teacher reflections. AI diagnostic button is commented out with TODO markers while decoupled.
- [`StudentSubmissionUploadModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/StudentSubmissionUploadModal.tsx): Dialog allowing students or teachers to upload assignment work via File upload, URL link, or raw text entry.
- [`AttendanceManagerModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/AttendanceManagerModal.tsx): Bulk daily attendance logger allowing teachers to mark student attendance (`Present`, `Absent`, `Late`, `Excused`) for a selected date with instant percentage updates.
- [`ReportCardModal.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/ReportCardModal.tsx): Generates printable, branded student progress report cards and parent briefings formatted for browser printing and PDF export.

---

## 💡 Role in the Application

This module powers all student-centric workflows: enrollment, portfolio assessment, submission evaluation, attendance tracking, and parent communication.

For state transitions, submission lifecycles, and rubric calculations, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/students/code.ARCH.md).
