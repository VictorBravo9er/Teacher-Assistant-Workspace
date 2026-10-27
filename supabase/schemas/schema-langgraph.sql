-- ==========================================
-- LangGraph Checkpointer & Store Schema Security Setup
-- ==========================================
-- IMPORTANT: Run this script AFTER your LangGraph application has called
-- PostgresSaver.setup() and PostgresStore.setup() so that the standard tables already exist.

-- 1. Create the dedicated backend writer role if it doesn't exist
-- no need : we need username:password to be used in DB URI
-- DO $$
-- BEGIN
--   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'langgraph_writer') THEN
--     CREATE ROLE langgraph_writer NOLOGIN;
--   END IF;
-- END
-- $$;

-- Grant basic usage on the langgraph schema
GRANT USAGE ON SCHEMA langgraph TO langgraph_writer;

-- ==========================================
-- 2. ENABLE RLS
-- ==========================================
-- Ensure that Row Level Security is enforced so public access is blocked.
ALTER TABLE langgraph.checkpoint_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. REVOKE PUBLIC ACCESS
-- ==========================================
-- Prevent anonymous or authenticated web users from querying LangGraph backend state
REVOKE ALL ON langgraph.checkpoint_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoints FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_blobs FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_writes FROM anon, authenticated;
REVOKE ALL ON langgraph.store_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.store FROM anon, authenticated;

-- ==========================================
-- 4. GRANT PERMISSIONS TO LANGGRAPH_WRITER
-- ==========================================
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoints TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_blobs TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_writes TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store TO langgraph_writer;

-- ==========================================
-- 5. DEFINE RLS POLICIES FOR LANGGRAPH_WRITER
-- ==========================================
-- Allow the langgraph_writer role to read/write freely (bypasses RLS blocks via these policies)

-- A) checkpoint_migrations
DROP POLICY IF EXISTS langgraph_writer_select ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_select ON langgraph.checkpoint_migrations FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_insert ON langgraph.checkpoint_migrations FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_update ON langgraph.checkpoint_migrations FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_delete ON langgraph.checkpoint_migrations FOR DELETE TO langgraph_writer USING (true);

-- B) checkpoints
DROP POLICY IF EXISTS langgraph_writer_select_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_select_checkpoints ON langgraph.checkpoints FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_insert_checkpoints ON langgraph.checkpoints FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_update_checkpoints ON langgraph.checkpoints FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_delete_checkpoints ON langgraph.checkpoints FOR DELETE TO langgraph_writer USING (true);

-- C) checkpoint_blobs
DROP POLICY IF EXISTS langgraph_writer_select_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_select_blobs ON langgraph.checkpoint_blobs FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_insert_blobs ON langgraph.checkpoint_blobs FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_update_blobs ON langgraph.checkpoint_blobs FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_delete_blobs ON langgraph.checkpoint_blobs FOR DELETE TO langgraph_writer USING (true);

-- D) checkpoint_writes
DROP POLICY IF EXISTS langgraph_writer_select_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_select_writes ON langgraph.checkpoint_writes FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_insert_writes ON langgraph.checkpoint_writes FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_update_writes ON langgraph.checkpoint_writes FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_delete_writes ON langgraph.checkpoint_writes FOR DELETE TO langgraph_writer USING (true);

-- E) store_migrations
DROP POLICY IF EXISTS langgraph_writer_select_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_select_store_migrations ON langgraph.store_migrations FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_insert_store_migrations ON langgraph.store_migrations FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_update_store_migrations ON langgraph.store_migrations FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_delete_store_migrations ON langgraph.store_migrations FOR DELETE TO langgraph_writer USING (true);

-- F) store
DROP POLICY IF EXISTS langgraph_writer_select_store ON langgraph.store;
CREATE POLICY langgraph_writer_select_store ON langgraph.store FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_store ON langgraph.store;
CREATE POLICY langgraph_writer_insert_store ON langgraph.store FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_store ON langgraph.store;
CREATE POLICY langgraph_writer_update_store ON langgraph.store FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_store ON langgraph.store;
CREATE POLICY langgraph_writer_delete_store ON langgraph.store FOR DELETE TO langgraph_writer USING (true);
