# Geographic Data Architecture & Cascading Invariants

This document details the interface contracts and cascading rules for geographical reference datasets in `frontend/src/data/`.

---

## 1. Geographic Cascading Flow

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Country["Country Selection (e.g. 'India')"] --> State["State / UT Selection (Object.keys(GEOGRAPHY_DATA[country].states))"]
    State --> District["District Selection (GEOGRAPHY_DATA[country].states[state])"]
    District --> City["City Input (Existing Cached Institute Suggestions + Free-Text Entry)"]
    City --> Sanitize["sanitizeLocationInput() -> Title Case & Trimmed"]
```

---

## 2. Invariants & Guarantees

1. **Deterministic Administrative Divisions**:
   - Indian districts are administrative entities; maintaining them locally prevents duplicate entries (e.g., `"bangalore"`, `"Bangalore Urban"`, `"BANGALORE"`) and cross-state mismatches (e.g., Selecting State: "Karnataka" and District: "Pune").
2. **Offline Availability**:
   - Dropdown options resolve synchronously without network latency or debouncing delays.
3. **Smart Free-Text Fallback**:
   - Cities, towns, and villages are unbounded. While District selection is restricted to legitimate administrative areas, City allows free-text input and automatically normalizes to Title Case via `sanitizeLocationInput()`.
