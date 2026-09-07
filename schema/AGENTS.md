# Database & Schema Rules — PostgreSQL / Supabase / DDL

This document defines the rules, conventions, and operational practices for database schemas, PostgreSQL DDL, and Edge Functions in `schema/` and `supabase/`. These rules cascade from and specialize the universal workspace principles defined in the root [`/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/AGENTS.md).

---

## 1. Schema File Organization

```
Teacher-Assistant-Workspace/
├── schema/
│   ├── schema-db.sql         # Core application tables, indexes, constraints & RLS
│   └── schema-langgraph.sql  # LangGraph checkpoint persistence tables
└── supabase/
    └── functions/            # Deno-based Supabase Edge Functions
```

---

## 2. Row Level Security (RLS) Standards (Mandatory)

To prevent data leaks and guarantee multi-tenant security:
- **Enable RLS on Every Table**:
  ```sql
  ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;
  ```
- **Explicit Policies**: Write unambiguous policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
- **User Ownership**: Scope policies to the authenticated user ID (`auth.uid() = user_id`) or verified organizational roles.
- **Service Role Bypass**: Keep service role access guarded and explicitly declared.

---

## 3. DDL & Indexing Conventions

1. **Primary Keys**: Always use UUID (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`) or standard sequence bigints.
2. **Foreign Key Indexing**: **Every foreign key column must have a corresponding index** to maintain high join performance and safe cascading operations.
3. **Timestamps**: Include standard audit columns on all core tables:
   ```sql
   created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
   updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
   ```
4. **Naming Conventions**: Use `snake_case` for all table names, column names, constraints, and index identifiers (e.g. `idx_classes_teacher_id`).

---

## 4. Supabase Edge Functions (`supabase/functions/`)

For detailed guidelines, security practices, and request handling rules for Deno-based edge functions, see [`supabase/functions/AGENTS.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/supabase/functions/AGENTS.md).
