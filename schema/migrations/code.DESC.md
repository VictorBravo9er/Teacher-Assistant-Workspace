# Database Migrations — `schema/migrations/`

This directory contains versioned, incremental SQL migration scripts executed against live PostgreSQL databases to evolve schemas predictably without dropping tables or losing persistent data.

---

## 📁 Directory Files

- [`001_add_class_student_portfolio_fields.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/001_add_class_student_portfolio_fields.sql): Adds portfolio columns (`phone`, `address`, `parent_name`, `parent_contact`, `parent_notes`, `custom_fields`, `roll_number`) to `public.class_students`, adds `'Text'` to `public.content_type` ENUM, and relaxes `validate_content_array` constraint function to allow pathless text items.
- [`002_student_portal_rls.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/002_student_portal_rls.sql): Adds Student Portal RLS policies for enrolled student read access and assignment turn-ins.
- [`003_create_announcements.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/003_create_announcements.sql): Creates `public.announcements` table, foreign keys, indexes, and RLS policies.
- [`004_create_notification_logs.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/004_create_notification_logs.sql): Creates `public.notification_logs` table for outbound email audit tracking and Resend webhook reconciliation.
- [`005_fix_classes_rls_recursion.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/005_fix_classes_rls_recursion.sql): Introduces `public.is_class_teacher(UUID)` `SECURITY DEFINER` helper to prevent circular RLS evaluation between `classes` and `class_students`.
- [`006_add_table_updated_at_triggers.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/006_add_table_updated_at_triggers.sql): Adds `updated_at` columns, `set_updated_at()` triggers, and `check_workspace_modifications()` RPC for granular cache revalidation.
- [`007_move_student_contact_fields_to_students.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/007_move_student_contact_fields_to_students.sql): Relocates `phone`, `address`, `parent_name`, and `parent_contact` from `public.class_students` to `public.students` (with data backfill) and updates the `public.students` `UPDATE` RLS policy to permit enrolled class teachers.
