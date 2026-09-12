# Frontend Utility Library — `src/lib/`

This directory provides client configuration helpers, storage abstractions, calculation utilities, theme token dictionaries, and fallback mock generators.

---

## 📁 Directory Files

- [`supabase.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/supabase.ts): Initializes and exports the singleton typed Supabase client (`createClient<Database>`) using environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- [`studentCalculations.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/studentCalculations.ts): Pure utility functions computing student performance tiers, attendance percentages, class average scores, and rubric score weight totals.
- [`storage.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/storage.ts): Local storage wrapper providing type-safe persistence and fallback retrieval for user preferences and draft data.
- [`themeStyles.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/themeStyles.ts): Tier 3 Tailwind style constant dictionaries centralizing recurring CSS class configurations for cards, inputs, badges, and layout panels.
- [`mockChat.ts`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/mockChat.ts): Fallback pedagogical AI chat response generator for offline demonstration and testing.

---

## 💡 Role in the Application

`src/lib/` contains shared, framework-independent helper functions, eliminating duplicated calculations and centralizing client initializers.

For mathematical algorithms, theme style dictionaries, and Supabase client contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/lib/code.ARCH.md).
