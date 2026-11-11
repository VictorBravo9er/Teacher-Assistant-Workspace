# Backend Types & Schemas — `src/types/`

This directory defines the authoritative data models, Pydantic v2 validation contracts, and database schema representations for the backend service.

---

## 📁 Directory Files

- [`schemas.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/schemas.py): Core Pydantic v2 data models defining the chat and classroom API contract (`Message`, `Material`, `Instruction`, `Student`, `StudentGrade`, `AnalysisConfig`, `ChatPayload` with `classItemName`, `class_id`, and `confirmed_soft_warning`).
- [`ai.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/ai.py): Strict Pydantic v2 models for rubric evaluation (`GradeRequest`, `GradeResponse`, `RubricBreakdownItem`), material analysis (`MaterialAnalyzeRequest`, `MaterialAnalyzeResponse`), hierarchical trees (`TreeNode`, `MaterialTree`, `MaterialTreeRequest`, `MaterialTreeResponse`), OKF v0.2 knowledge graph entities (`OntologyConcept`, `OntologyRelationship`, `MaterialConceptMapping`, `StudentConceptMastery`), soft-warning verification (`CheckAnswerableResult`), proposed misconceptions (`OntologyMisconception`, `MisconceptionReviewRequest`), and consolidation runs (`ConsolidationRun`, `ConsolidationRequest`, `ConsolidationResponse`).
- [`db.py`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/backend/src/types/db.py): Auto-generated Python TypedDict contracts mirroring the PostgreSQL `public` database tables (`classes`, `students`, `materials`, `instructions`, `student_submissions`, etc.), produced via the Supabase CLI.

---

## Architecture & Data Flow

### 1. Schema Hierarchy & Model Composition

```mermaid
classDiagram
    class ChatPayload {
        +list[Message] messages
        +str workspaceName
        +str? classItemName
        +str? class_id
        +bool confirmed_soft_warning
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

### 2. Knowledge Store & AI Domain Models (`src/types/ai.py`)

```mermaid
classDiagram
    class TreeNode {
        +str node_id
        +str title
        +int page_start
        +int page_end
        +str summary
        +list[str] key_concepts
        +list[TreeNode] children
    }

    class MaterialTree {
        +str? id
        +str material_id
        +TreeNode root_node
        +int total_nodes
        +int max_depth
        +int page_count
        +str status
    }

    class OntologyConcept {
        +str? id
        +str subject
        +str? code
        +str name
        +str description
        +str bloom_level
        +str okf_type
        +str status
        +str? verified_by
        +list[str] tags
    }

    class OntologyMisconception {
        +str? id
        +str? class_id
        +str concept_id
        +str? name
        +str error_pattern
        +str remediation_strategy
        +str severity
        +str status
        +float confidence
        +list[str] evidence_submission_ids
        +bool surfaced_in_gradebook
    }

    class StudentConceptMastery {
        +str class_id
        +str student_id
        +str concept_id
        +float mastery_score
        +float confidence
        +str status
        +list[str] evidence_submission_ids
    }

    class CheckAnswerableResult {
        +bool is_answerable
        +str status_flag
        +float coverage_score
        +int matched_concept_count
        +list[str] missing_terms
        +bool requires_confirmation
        +str? caveat_message
    }

    class ConsolidationResponse {
        +str run_id
        +str status
        +bool drift_detected
        +int orphaned_nodes_found
        +int cycles_resolved
        +int misconceptions_synthesized
        +str summary
    }

    MaterialTree *-- TreeNode
```

---

### 3. Key Architectural Invariants

1. **Pydantic v2 Contract Boundaries (`schemas.py`, `ai.py`)**:
   - Uses strict field definitions (`BaseModel`) with default empty collections (`= []`) and optional string defaults (`= ""`), eliminating `NoneType` attribute errors during downstream string formatting.
   - `ai.py` models enforce non-Any typed interfaces for rubric evaluation requests, structured feedback breakdowns, prerequisite gap outputs, and ontology knowledge representations.
   - Provides runtime deserialization and validation at FastAPI endpoint ingress points.
2. **Database Types Invariant (`db.py`)**:
   - Generated mechanically via `supabase gen types --lang=python` (`scripts/_generate_types.py`).
   - Declares `TypedDict` models representing `Row`, `Insert`, and `Update` structures for all database tables and views.
   - **Manual edits are strictly prohibited** in both frontend and backend development to maintain synchronization with PostgreSQL DDL. All custom schemas must be defined in `schemas.py` or `ai.py`.
