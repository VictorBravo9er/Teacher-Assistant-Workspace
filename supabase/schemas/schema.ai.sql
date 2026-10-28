


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "ai";


ALTER SCHEMA "ai" OWNER TO "postgres";


COMMENT ON SCHEMA "ai" IS 'Internal, non-exposed schema for vector embeddings, ontological knowledge graphs, and AI evaluation caches.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "ai"."material_concept_mappings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "concept_id" "uuid" NOT NULL,
    "chunk_id" "uuid",
    "relationship" "text" DEFAULT 'teaches'::"text" NOT NULL,
    "relevance_score" numeric DEFAULT 1.0,
    "evidence_excerpt" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."material_concept_mappings" OWNER TO "postgres";


COMMENT ON TABLE "ai"."material_concept_mappings" IS 'Hybrid bridge linking material chunks and vector embeddings to ontology concepts.';



CREATE TABLE IF NOT EXISTS "ai"."material_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "material_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_content" "text" NOT NULL,
    "token_count" integer,
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."material_embeddings" OWNER TO "postgres";


COMMENT ON TABLE "ai"."material_embeddings" IS 'pgvector chunks and embeddings for class materials RAG.';



CREATE TABLE IF NOT EXISTS "ai"."material_insights" (
    "material_id" "uuid" NOT NULL,
    "syllabus_alignment" "jsonb" DEFAULT '[]'::"jsonb",
    "prerequisite_gaps" "jsonb" DEFAULT '[]'::"jsonb",
    "sample_questions" "jsonb" DEFAULT '[]'::"jsonb",
    "summary" "text",
    "difficulty_level" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "model_used" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."material_insights" OWNER TO "postgres";


COMMENT ON TABLE "ai"."material_insights" IS 'Cached syllabus alignment, prerequisite gap analyses, and sample questions for materials.';



CREATE TABLE IF NOT EXISTS "ai"."ontology_concepts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subject" "text" NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "description" "text" NOT NULL,
    "bloom_level" "text" DEFAULT 'Understand'::"text",
    "parent_concept_id" "uuid",
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."ontology_concepts" OWNER TO "postgres";


COMMENT ON TABLE "ai"."ontology_concepts" IS 'Pedagogical knowledge graph concept nodes with Bloom taxonomy levels and semantic embeddings.';



CREATE TABLE IF NOT EXISTS "ai"."ontology_misconceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "concept_id" "uuid" NOT NULL,
    "error_pattern" "text" NOT NULL,
    "remediation_strategy" "text" NOT NULL,
    "severity" "text" DEFAULT 'Moderate'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."ontology_misconceptions" OWNER TO "postgres";


COMMENT ON TABLE "ai"."ontology_misconceptions" IS 'Known pedagogical misconception patterns and targeted remediation strategies.';



CREATE TABLE IF NOT EXISTS "ai"."ontology_relationships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "source_concept_id" "uuid" NOT NULL,
    "target_concept_id" "uuid" NOT NULL,
    "relationship_type" "text" NOT NULL,
    "weight" numeric DEFAULT 1.0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "check_no_self_loops" CHECK (("source_concept_id" <> "target_concept_id"))
);


ALTER TABLE "ai"."ontology_relationships" OWNER TO "postgres";


COMMENT ON TABLE "ai"."ontology_relationships" IS 'Directed graph edges linking prerequisite, subconcept, and reinforcement dependencies.';



CREATE TABLE IF NOT EXISTS "ai"."student_concept_mastery" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "concept_id" "uuid" NOT NULL,
    "mastery_score" numeric DEFAULT 0.0 NOT NULL,
    "confidence" numeric DEFAULT 0.0 NOT NULL,
    "status" "text" DEFAULT 'unassessed'::"text" NOT NULL,
    "evidence_submission_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "last_evaluated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"())
);


ALTER TABLE "ai"."student_concept_mastery" OWNER TO "postgres";


COMMENT ON TABLE "ai"."student_concept_mastery" IS 'Dynamic knowledge state tracking student concept mastery, confidence, and gaps.';



CREATE TABLE IF NOT EXISTS "ai"."submission_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_content" "text" NOT NULL,
    "token_count" integer,
    "embedding" "extensions"."vector"(1536),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."submission_embeddings" OWNER TO "postgres";


COMMENT ON TABLE "ai"."submission_embeddings" IS 'pgvector chunks and embeddings for student submissions semantic search.';



CREATE TABLE IF NOT EXISTS "ai"."submission_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "suggested_score" numeric,
    "suggested_max_score" numeric,
    "suggested_grade" "text",
    "suggested_feedback" "text",
    "suggested_teacher_notes" "text",
    "suggested_rubric_breakdown" "jsonb" DEFAULT '[]'::"jsonb",
    "rationale" "text",
    "raw_extracted_text" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error_message" "text",
    "model_used" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "ai"."submission_evaluations" OWNER TO "postgres";


COMMENT ON TABLE "ai"."submission_evaluations" IS 'Pre-computed AI rubric evaluations, feedback drafts, and pedagogical notes for instant diff modals.';



ALTER TABLE ONLY "ai"."material_concept_mappings"
    ADD CONSTRAINT "material_concept_mappings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."material_embeddings"
    ADD CONSTRAINT "material_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."material_insights"
    ADD CONSTRAINT "material_insights_pkey" PRIMARY KEY ("material_id");



ALTER TABLE ONLY "ai"."ontology_concepts"
    ADD CONSTRAINT "ontology_concepts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."ontology_misconceptions"
    ADD CONSTRAINT "ontology_misconceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."ontology_relationships"
    ADD CONSTRAINT "ontology_relationships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."submission_embeddings"
    ADD CONSTRAINT "submission_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."submission_evaluations"
    ADD CONSTRAINT "submission_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "ai"."submission_evaluations"
    ADD CONSTRAINT "submission_evaluations_submission_id_key" UNIQUE ("submission_id");



ALTER TABLE ONLY "ai"."ontology_relationships"
    ADD CONSTRAINT "unique_concept_relationship" UNIQUE ("source_concept_id", "target_concept_id", "relationship_type");



ALTER TABLE ONLY "ai"."material_concept_mappings"
    ADD CONSTRAINT "unique_mat_concept_chunk" UNIQUE ("material_id", "concept_id", "chunk_id", "relationship");



ALTER TABLE ONLY "ai"."student_concept_mastery"
    ADD CONSTRAINT "unique_student_concept_mastery" UNIQUE ("class_id", "student_id", "concept_id");



CREATE INDEX "idx_ai_concepts_embedding" ON "ai"."ontology_concepts" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_ai_concepts_parent" ON "ai"."ontology_concepts" USING "btree" ("parent_concept_id");



CREATE INDEX "idx_ai_concepts_subject" ON "ai"."ontology_concepts" USING "btree" ("subject");



CREATE INDEX "idx_ai_insights_status" ON "ai"."material_insights" USING "btree" ("status");



CREATE INDEX "idx_ai_mastery_class" ON "ai"."student_concept_mastery" USING "btree" ("class_id");



CREATE INDEX "idx_ai_mastery_concept" ON "ai"."student_concept_mastery" USING "btree" ("concept_id");



CREATE INDEX "idx_ai_mastery_status" ON "ai"."student_concept_mastery" USING "btree" ("status");



CREATE INDEX "idx_ai_mastery_student" ON "ai"."student_concept_mastery" USING "btree" ("student_id");



CREATE INDEX "idx_ai_mat_embed_hnsw" ON "ai"."material_embeddings" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_ai_mat_embed_material_id" ON "ai"."material_embeddings" USING "btree" ("material_id");



CREATE INDEX "idx_ai_mat_map_chunk" ON "ai"."material_concept_mappings" USING "btree" ("chunk_id");



CREATE INDEX "idx_ai_mat_map_concept" ON "ai"."material_concept_mappings" USING "btree" ("concept_id");



CREATE INDEX "idx_ai_mat_map_material" ON "ai"."material_concept_mappings" USING "btree" ("material_id");



CREATE INDEX "idx_ai_miscon_concept" ON "ai"."ontology_misconceptions" USING "btree" ("concept_id");



CREATE INDEX "idx_ai_rel_source" ON "ai"."ontology_relationships" USING "btree" ("source_concept_id");



CREATE INDEX "idx_ai_rel_target" ON "ai"."ontology_relationships" USING "btree" ("target_concept_id");



CREATE INDEX "idx_ai_rel_type" ON "ai"."ontology_relationships" USING "btree" ("relationship_type");



CREATE INDEX "idx_ai_sub_embed_hnsw" ON "ai"."submission_embeddings" USING "hnsw" ("embedding" "extensions"."vector_cosine_ops");



CREATE INDEX "idx_ai_sub_embed_submission_id" ON "ai"."submission_embeddings" USING "btree" ("submission_id");



CREATE INDEX "idx_ai_sub_evals_status" ON "ai"."submission_evaluations" USING "btree" ("status");



CREATE INDEX "idx_ai_sub_evals_submission_id" ON "ai"."submission_evaluations" USING "btree" ("submission_id");



ALTER TABLE ONLY "ai"."material_concept_mappings"
    ADD CONSTRAINT "material_concept_mappings_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "ai"."material_embeddings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ai"."material_concept_mappings"
    ADD CONSTRAINT "material_concept_mappings_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."material_concept_mappings"
    ADD CONSTRAINT "material_concept_mappings_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."material_embeddings"
    ADD CONSTRAINT "material_embeddings_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."material_insights"
    ADD CONSTRAINT "material_insights_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."ontology_concepts"
    ADD CONSTRAINT "ontology_concepts_parent_concept_id_fkey" FOREIGN KEY ("parent_concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "ai"."ontology_misconceptions"
    ADD CONSTRAINT "ontology_misconceptions_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."ontology_relationships"
    ADD CONSTRAINT "ontology_relationships_source_concept_id_fkey" FOREIGN KEY ("source_concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."ontology_relationships"
    ADD CONSTRAINT "ontology_relationships_target_concept_id_fkey" FOREIGN KEY ("target_concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_concept_id_fkey" FOREIGN KEY ("concept_id") REFERENCES "ai"."ontology_concepts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."student_concept_mastery"
    ADD CONSTRAINT "student_concept_mastery_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."submission_embeddings"
    ADD CONSTRAINT "submission_embeddings_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "ai"."submission_evaluations"
    ADD CONSTRAINT "submission_evaluations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."student_submissions"("id") ON DELETE CASCADE;



CREATE POLICY "Authenticated users can view ontology concepts" ON "ai"."ontology_concepts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view ontology misconceptions" ON "ai"."ontology_misconceptions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view ontology relationships" ON "ai"."ontology_relationships" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Teacher can manage material insights" ON "ai"."material_insights" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."materials" "m"
  WHERE (("m"."id" = "material_insights"."material_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Teacher can manage their material embeddings" ON "ai"."material_embeddings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."materials" "m"
  WHERE (("m"."id" = "material_embeddings"."material_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Teacher or Student can access submission embeddings" ON "ai"."submission_embeddings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."student_submissions" "s"
     JOIN "public"."classes" "c" ON (("c"."id" = "s"."class_id")))
  WHERE (("s"."id" = "submission_embeddings"."submission_id") AND (("s"."student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Teacher or student can access submission evaluations" ON "ai"."submission_evaluations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."student_submissions" "s"
     JOIN "public"."classes" "c" ON (("c"."id" = "s"."class_id")))
  WHERE (("s"."id" = "submission_evaluations"."submission_id") AND (("s"."student_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



CREATE POLICY "Users can access material concept mappings" ON "ai"."material_concept_mappings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."materials" "m"
  WHERE (("m"."id" = "material_concept_mappings"."material_id") AND ("m"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can access student concept mastery" ON "ai"."student_concept_mastery" TO "authenticated" USING ((("student_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."classes" "c"
  WHERE (("c"."id" = "student_concept_mastery"."class_id") AND ("c"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))));



ALTER TABLE "ai"."material_concept_mappings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."material_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."material_insights" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."ontology_concepts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."ontology_misconceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."ontology_relationships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."student_concept_mastery" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."submission_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "ai"."submission_evaluations" ENABLE ROW LEVEL SECURITY;



