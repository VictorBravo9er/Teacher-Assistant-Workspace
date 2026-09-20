# Frontend Utilities — `frontend/src/utils/`

This directory provides universal formatting, transformation, and pedagogical metadata helper functions for the Teach&Learn frontend application.

---

## 📁 Directory Files

- [`enumFormatters.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/utils/enumFormatters.ts): Provides `formatEnumLabel`, converting snake_case and PascalCase database enum values into user-friendly, title-cased labels for UI display.
- [`enumTooltips.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/utils/enumTooltips.ts): Central dictionary containing pedagogical descriptions and definitions for all educational enums (`teaching_style`, `instruction_type`, `assessment_preference`, `content_category`, `submission_status`, `experience_level`). Includes `getEnumTooltip` with graceful empty fallback.
