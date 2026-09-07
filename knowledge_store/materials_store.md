# Curriculum & Materials Knowledge Store

The **Curriculum & Materials Knowledge Store** is the repository and compilation engine for all educational resources in Teach&Learn, including syllabi, textbooks, lecture slides, assignment briefs, and rubric definitions.

---

## 1. Architectural Blueprint & Ingestion Flow

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    subgraph UploadTrigger["1. Upload & Trigger"]
        Teacher["Teacher Client"] -->|Upload File (PDF, DOCX, PPTX, MD)| Bucket["Storage Bucket: class-materials"]
        Bucket -->|INSERT Trigger| DBTrigger["DB Trigger: trg_material_ai_analysis"]
        DBTrigger -->|pg_net POST| EdgeFn["Edge Function: trigger-material-analysis"]
    end

    subgraph Normalization["2. Multi-Modal Parsing & Routing"]
        EdgeFn -->|Download Blob| DocParser["Text & Structure Parser (markitdown / pdfjs)"]
        DocParser --> PageCheck{"Page Count ≥ 20?"}
    end

    subgraph IndexingRoutes["3. Multi-Tier Indexing Engine"]
        PageCheck -->|Yes: Long Document| TreeBuilder["PageIndex Tree Indexing Engine"]
        PageCheck -->|No: Short Document| ChunkBuilder["Semantic Window Chunking (512-1024 Tokens)"]
        
        TreeBuilder -->|Hierarchical JSONB Structure| MatTreeTable[("ai.material_trees")]
        ChunkBuilder -->|Dense Embeddings (1536-dim)| MatEmbedTable[("ai.material_embeddings")]
    end

    subgraph OntologicalSynthesis["4. Ontological Compilation Phase"]
        DocParser --> LLMCompiler["LLM Knowledge Compiler (Backend Service)"]
        LLMCompiler -->|Extract Concepts & Bloom Levels| ConceptsTable[("ai.ontology_concepts")]
        LLMCompiler -->|Map Prerequisite Edges| RelTable[("ai.ontology_relationships")]
        LLMCompiler -->|Map Material Chunks to Concepts| MapTable[("ai.material_concept_mappings")]
        LLMCompiler -->|Pedagogical Insights & Gaps| InsightsTable[("ai.material_insights")]
    end
```

---

## 2. Ingestion & Multi-Modal Normalization

1. **Storage Bucket Organization**:
   Files reside in the private bucket `class-materials` under structured paths:
   `/{teacher_user_id}/{material_id}/{content_item_id}.{ext}`
2. **Supported Formats**:
   - **Textual & Presentation**: `.pdf`, `.docx`, `.pptx`, `.txt`, `.md`.
   - **Tabular & Data**: `.csv`, `.xlsx`.
   - **Visuals**: `.png`, `.jpg` (processed via Vision LLM / OCR in PageIndex Cloud when configured).
3. **Markdown Normalization via `markitdown`**:
   The parser cleans and normalizes all input formats into standardized Markdown, converting embedded tables to Markdown tables and preserving header structures (`#`, `##`, `###`).

---

## 3. Hierarchical Tree Indexing Algorithm (PageIndex & RAPTOR Inspiration)

For complex multi-page educational materials (e.g., textbook chapters, detailed curriculum frameworks, or 40+ slide decks), traditional fixed-size chunking destroys hierarchical context. The Materials Store employs a **Hierarchical Tree Index**:

```mermaid
%%{init: {'flowchart': {'curve': 'linear'}}}%%
flowchart TD
    RootNode["Root Node: Full Document Overview (Executive Summary & Subject Scope)"]
    
    Unit1["Unit / Chapter 1 Node (Summary & Learning Objectives)"]
    Unit2["Unit / Chapter 2 Node (Summary & Learning Objectives)"]
    
    Sec11["Section 1.1: Core Concept Definition (Summary)"]
    Sec12["Section 1.2: Worked Examples & Formulas (Summary)"]
    Sec21["Section 2.1: Advanced Applications (Summary)"]

    Leaf111["Leaf Paragraph: Theorem 1.1 Proof"]
    Leaf112["Leaf Table: Constant Value Table"]
    Leaf121["Leaf Example: Problem Set #3 Solution"]

    RootNode --> Unit1
    RootNode --> Unit2
    Unit1 --> Sec11
    Unit1 --> Sec12
    Unit2 --> Sec21
    Sec11 --> Leaf111
    Sec11 --> Leaf121
    Sec12 --> Leaf112
```

### Database Schema for Tree Storage (`ai.material_trees`):
```sql
CREATE TABLE IF NOT EXISTS ai.material_trees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    root_node JSONB NOT NULL, -- Recursive Tree: { id, title, level, summary, page_start, page_end, children: [...], leaf_chunk_ids: [...] }
    total_nodes INTEGER NOT NULL,
    max_depth INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_material_tree UNIQUE (material_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_mat_trees_material_id ON ai.material_trees(material_id);
```

### Tree Indexing Construction Algorithm:
1. **Structural Segmentation**: Extract document hierarchy using heading tags and table of contents.
2. **Bottom-Up Summarization**:
   - For every leaf chunk (200-400 tokens), create a node reference.
   - For every parent section, aggregate child summaries and synthesize a section-level learning abstract.
   - For the document root, produce an executive pedagogical syllabus map.
3. **Agent Traversal Index**: The resulting tree enables the AI Assistant to locate target information via top-down reasoning:
   $$\text{Doc Root} \xrightarrow{\text{Filter by Unit}} \text{Unit Summary} \xrightarrow{\text{Filter by Section}} \text{Target Paragraph Chunk}$$

---

## 4. Dense Vector Semantic Indexing (`ai.material_embeddings`)

For fast similarity retrieval, granular chunks are embedded into 1536-dimensional vectors using OpenAI `text-embedding-3-small` (or Gemini embedding equivalents):

```sql
CREATE TABLE IF NOT EXISTS ai.material_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_content TEXT NOT NULL,
    token_count INTEGER,
    embedding extensions.vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g. { "page": 4, "section": "1.2", "has_table": true }
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_mat_embed_hnsw 
ON ai.material_embeddings USING hnsw (embedding extensions.vector_cosine_ops);
```

---

## 5. Ontological Knowledge Graph Construction (Curriculum Graph)

When material is compiled, the backend automatically extracts curriculum concepts, Bloom's Taxonomy levels, and prerequisite relationships:

```mermaid
erDiagram
    ontology_concepts ||--o{ ontology_relationships : "connects_prerequisite"
    ontology_concepts ||--o{ material_concept_mappings : "taught_by"
    materials ||--o{ material_concept_mappings : "contains"
    materials ||--o{ material_insights : "produces"
```

1. **`ai.ontology_concepts`**:
   - Represents subject learning objectives (`subject`, `code`, `name`, `description`, `bloom_level`, `parent_concept_id`).
   - `bloom_level` ∈ `{'Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'}`.
2. **`ai.ontology_relationships`**:
   - Directed knowledge edges (`source_concept_id`, `target_concept_id`, `relationship_type`, `weight`).
   - Types: `'prerequisite_of'`, `'subconcept_of'`, `'reinforces'`, `'related_to'`.
3. **`ai.material_concept_mappings`**:
   - Explicit bridge linking material text chunks to ontological concepts with a confidence score and evidence excerpt:
   ```sql
   CREATE TABLE IF NOT EXISTS ai.material_concept_mappings (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
       concept_id UUID NOT NULL REFERENCES ai.ontology_concepts(id) ON DELETE CASCADE,
       chunk_id UUID REFERENCES ai.material_embeddings(id) ON DELETE SET NULL,
       relationship TEXT NOT NULL DEFAULT 'teaches', -- 'teaches', 'assesses', 'prerequisite_for'
       relevance_score NUMERIC DEFAULT 1.0,
       evidence_excerpt TEXT,
       created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
   );
   ```
4. **`ai.material_insights`**:
   - Stores automated syllabus alignment scores, detected prerequisite knowledge gaps, and generated multi-choice practice questions.
