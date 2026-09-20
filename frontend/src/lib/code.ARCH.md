# Library Architecture & Mathematical Contracts

This document details the calculation algorithms, client initializations, and theme dictionaries implemented in `frontend/src/lib/`.

---

## 1. Domain Calculations & Score Reducers (`studentCalculations.ts`)

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Submissions["Student Submissions List"] --> ScoreCalc["calculateOverallScore(submissions, materials)"]
    ScoreCalc --> Percent["Calculated Overall Percentage"]
    
    Percent --> TierMap{"Map Performance Tier"}
    TierMap -- ">= 85%" --> High["'High' Tier (Green Badge)"]
    TierMap -- "65% - 84%" --> Avg["'Average' Tier (Yellow Badge)"]
    TierMap -- "< 65%" --> AtRisk["'At Risk' Tier (Red Badge)"]
    
    AttendanceLogs["Attendance Records"] --> AttendanceCalc["calculateAttendanceRate(records)"]
    AttendanceCalc --> AttPercent["Weighted Attendance Percentage"]
```

---

## 2. Component Design & Structural Invariants

1. **`supabase.ts` Singleton**:
   - Reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.
   - Binds the auto-generated database interface `Database` from `types/db.ts` to ensure type-safe query builders across all services.
2. **`themeStyles.ts` Design Dictionaries**:
   - Represents Tier 3 of the Tailwind consolidation architecture.
   - Centralizes complex multi-class strings (e.g. `CARD_BASE`, `MODAL_BACKDROP`, `BADGE_STATUS_MAP`) to prevent class drift across disparate component files.
