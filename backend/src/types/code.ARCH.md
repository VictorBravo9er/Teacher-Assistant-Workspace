# Backend Type Architecture & Data Contracts

This document details the data modeling design, runtime validation boundaries, and database type mappings implemented in `backend/src/types/`.

---

## 1. Schema Hierarchy & Model Composition

```mermaid
classDiagram
    class ChatPayload {
        +list[Message] messages
        +str workspaceName
        +str subject
        +str academicYear
        +str semester
        +str teacherName
        +str teachingStyle
        +str? specialNotes
        +str? assessmentPreferences
        +list[Material] materials
        +list[Instruction] instructions
        +list[Student] students
        +AnalysisConfig? newAnalysisConfig
    }

    class Message {
        +str id
        +str role
        +str text
        +str timestamp
    }

    class Material {
        +str name
        +str type
        +list[str]? tags
    }

    class Instruction {
        +str title
        +str type
        +str content
    }

    class Student {
        +str name
        +str rollNumber
        +str email
        +str performanceIndicator
        +float attendance
        +list[StudentGrade] grades
        +list[StudentCustomField] customFields
        +str? parentName
        +str? parentContact
        +str? parentNotes
    }

    class AnalysisConfig {
        +str type
        +str scopeType
        +list[str] selectedIds
        +str? customInstructions
    }

    ChatPayload *-- Message
    ChatPayload *-- Material
    ChatPayload *-- Instruction
    ChatPayload *-- Student
    ChatPayload *-- AnalysisConfig
```

---

## 2. Key Architectural Invariants

1. **Pydantic v2 Contract Boundaries (`schemas.py`, `ai.py`)**:
   - Uses strict field definitions (`BaseModel`) with default empty collections (`= []`) and optional string defaults (`= ""`), eliminating `NoneType` attribute errors during downstream string formatting.
   - `ai.py` models enforce non-Any typed interfaces for rubric evaluation requests, structured feedback breakdowns, prerequisite gap outputs, and ontology knowledge representations.
   - Provides runtime deserialization and validation at FastAPI endpoint ingress points.
2. **Database Types Invariant (`db.py`)**:
   - Generated mechanically by `scripts/_generate_types.py`. Manual edits are discouraged to maintain synchronization with PostgreSQL DDL.
   - Declares `TypedDict` models representing `Row`, `Insert`, and `Update` structures for all database tables and views.

