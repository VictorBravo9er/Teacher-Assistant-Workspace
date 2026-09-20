# Calendar Feature Architecture

This document describes the event aggregation architecture and calendar calculation patterns in `frontend/src/features/calendar/`.

---

## 1. Domain Event Aggregation

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart LR
    M["materials (due_at)"] --> AGG["CalendarView.useMemo Aggregator"]
    A["attendance_records (date)"] --> AGG
    N["announcements (created_at)"] --> AGG
    AGG --> MAP["Map<YYYY-MM-DD, CalendarDayEvent[]>"]
    MAP --> GRID["Monthly Calendar Matrix"]
    GRID --> DAY["Selected Day Drawer"]
```

---

## 2. Invariants

- **No Third-Party Calendar Libs**: Uses zero external calendar dependencies for bundle efficiency.
- **Dynamic Aggregation**: Derives events from existing domain models (`Material`, `AttendanceRecord`, `Announcement`) without separate calendar sync tables.
