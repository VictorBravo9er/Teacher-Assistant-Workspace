# Database Migrations — `schema/migrations/`

This directory contains versioned, incremental SQL migration scripts executed against live PostgreSQL databases to evolve schemas predictably without dropping tables or losing persistent data.

---

## 📁 Directory Files

- [`001_add_class_student_portfolio_fields.sql`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/schema/migrations/001_add_class_student_portfolio_fields.sql): Adds portfolio columns (`phone`, `address`, `parent_name`, `parent_contact`, `parent_notes`, `custom_fields`, `roll_number`) to `public.class_students`, adds `'Text'` to `public.content_type` ENUM, and relaxes `validate_content_array` constraint function to allow pathless text items.
