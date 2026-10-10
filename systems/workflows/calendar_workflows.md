# Academic Calendar & Schedule Workflows

This document outlines the architecture and user journeys for the interactive **Academic Calendar** module (`frontend/src/features/calendar/CalendarView.tsx`), shared between educator workspaces (`ClassApp.tsx`) and the student portal (`StudentApp.tsx`).

---

## 1. Workflow: Academic Schedule Aggregation & Rendering

The Academic Calendar aggregates deadlines, classroom sessions, and course announcements into a unified monthly matrix without requiring external calendar integrations or dedicated synchronization database tables.

```mermaid
sequenceDiagram
    autonumber
    actor User as Educator / Student
    participant UI as CalendarView.tsx
    participant Store as Local Domain State (Materials, Attendance, Announcements)
    participant Modal as MaterialPreviewModal

    User->>UI: Selects "Calendar" tab in ClassApp or StudentApp
    UI->>Store: Ingests materials, attendanceRecords, and announcements props
    UI->>UI: useMemo computes CalendarDayEvent[] matrix grouped by YYYY-MM-DD
    UI-->>User: Renders monthly grid with colored event chips (red=deadline, green=class, blue=announcement)
    User->>UI: Clicks specific date on the calendar
    UI->>UI: Opens selected day drawer / event inspector
    opt If Material Deadline Event Clicked
        User->>UI: Clicks event title
        UI->>Modal: Triggers onSelectMaterial(material)
        Modal-->>User: Opens Material Preview modal for curriculum inspection
    end
```

### Execution Invariants:
1. **Zero External Lib Dependencies**: Calendar computation uses pure JavaScript `Date` arithmetic and grid layout, keeping bundle size minimal.
2. **Real-Time Synthesis**: Events are purely derived from domain objects (`materials.due_at`, `attendance_records.date`, `announcements.created_at`).
3. **Role Adaptability**:
   - In `ClassApp.tsx`: Displays class-wide deadlines, past and scheduled attendance dates, and teacher announcements.
   - In `StudentApp.tsx`: Scoped to the student's actively selected course with clickable preview triggers.

---

## 2. Workflow: Month Navigation & Day Inspection

```mermaid
sequenceDiagram
    autonumber
    actor User as Educator / Student
    participant UI as CalendarView.tsx

    User->>UI: Clicks Next / Previous month chevron
    UI->>UI: Updates currentDate state (setCurrentDate)
    UI->>UI: Re-evaluates days in month, start day offset, and month event map
    UI-->>User: Transitions month view seamlessly
    User->>UI: Clicks "Today" quick action button
    UI->>UI: Sets currentDate to new Date() and selects today's date
    UI-->>User: Focuses calendar grid on today with highlighted indicator
```
