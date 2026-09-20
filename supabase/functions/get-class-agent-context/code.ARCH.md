# Agent Context Aggregation Architecture

This document details the aggregation architecture, relational joining strategies, and caching models for `supabase/functions/get-class-agent-context/`.

---

## 1. Context Aggregation Pipeline

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    Req["POST /functions/v1/get-class-agent-context { class_id }"] --> Auth["Verify Teacher / Student Auth"]
    
    Auth --> ParallelQueries["Execute Parallel PostgREST Queries"]
    
    subgraph DataAssembly["Parallel Data Fetching"]
        ClassMeta["Query classes & institutes"]
        Materials["Query class_materials & materials"]
        Instructions["Query class_instructions & instructions"]
        Students["Query class_students, students & submissions"]
    end

    ParallelQueries --> ClassMeta & Materials & Instructions & Students
    ClassMeta & Materials & Instructions & Students --> Aggregator["Compile Structured JSON Context"]
    Aggregator --> Response["Return 200 OK (Full Classroom Context)"]
```

---

## 2. Invariants & Output Contract

### Context Response Schema:
```typescript
interface ClassAgentContextResponse {
  class: {
    id: string;
    name: string;
    subject: string;
    academicYear: string;
    semester: string;
    teachingStyle: string[];
    assessmentPreferences: string[];
    specialNotes?: string;
  };
  materials: Array<{ id: string; name: string; category: string; content: any[] }>;
  instructions: Array<{ id: string; title: string; type: string; content: string }>;
  students: Array<{
    id: string;
    name: string;
    rollNumber: string;
    attendanceRate: number;
    submissions: any[];
  }>;
}
```

### Performance Optimization:
- Uses `Promise.all` to query database junction tables concurrently, minimizing serverless runtime latency.
