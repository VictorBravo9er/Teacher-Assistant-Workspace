-- ============================================================================
-- Teach&Learn: LangGraph Row Level Security (RLS) & Permissions
-- Timestamp: 20260915130100
-- Schema: langgraph
-- ============================================================================

-- 1. Row Level Security Setup
ALTER TABLE langgraph.checkpoint_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store ENABLE ROW LEVEL SECURITY;

-- 2. Revoke Public / Anon / Authenticated Access
REVOKE ALL ON langgraph.checkpoint_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoints FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_blobs FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_writes FROM anon, authenticated;
REVOKE ALL ON langgraph.store_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.store FROM anon, authenticated;

-- 3. Grant Permissions to langgraph_writer
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoints TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_blobs TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_writes TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store TO langgraph_writer;

-- 4. Policies for langgraph_writer
DROP POLICY IF EXISTS langgraph_writer_select ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_select ON langgraph.checkpoint_migrations FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_insert ON langgraph.checkpoint_migrations FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_update ON langgraph.checkpoint_migrations FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete ON langgraph.checkpoint_migrations;
CREATE POLICY langgraph_writer_delete ON langgraph.checkpoint_migrations FOR DELETE TO langgraph_writer USING (true);

DROP POLICY IF EXISTS langgraph_writer_select_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_select_checkpoints ON langgraph.checkpoints FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_insert_checkpoints ON langgraph.checkpoints FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_update_checkpoints ON langgraph.checkpoints FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_checkpoints ON langgraph.checkpoints;
CREATE POLICY langgraph_writer_delete_checkpoints ON langgraph.checkpoints FOR DELETE TO langgraph_writer USING (true);

DROP POLICY IF EXISTS langgraph_writer_select_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_select_blobs ON langgraph.checkpoint_blobs FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_insert_blobs ON langgraph.checkpoint_blobs FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_update_blobs ON langgraph.checkpoint_blobs FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_blobs ON langgraph.checkpoint_blobs;
CREATE POLICY langgraph_writer_delete_blobs ON langgraph.checkpoint_blobs FOR DELETE TO langgraph_writer USING (true);

DROP POLICY IF EXISTS langgraph_writer_select_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_select_writes ON langgraph.checkpoint_writes FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_insert_writes ON langgraph.checkpoint_writes FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_update_writes ON langgraph.checkpoint_writes FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_writes ON langgraph.checkpoint_writes;
CREATE POLICY langgraph_writer_delete_writes ON langgraph.checkpoint_writes FOR DELETE TO langgraph_writer USING (true);

DROP POLICY IF EXISTS langgraph_writer_select_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_select_store_migrations ON langgraph.store_migrations FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_insert_store_migrations ON langgraph.store_migrations FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_update_store_migrations ON langgraph.store_migrations FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_store_migrations ON langgraph.store_migrations;
CREATE POLICY langgraph_writer_delete_store_migrations ON langgraph.store_migrations FOR DELETE TO langgraph_writer USING (true);

DROP POLICY IF EXISTS langgraph_writer_select_store ON langgraph.store;
CREATE POLICY langgraph_writer_select_store ON langgraph.store FOR SELECT TO langgraph_writer USING (true);
DROP POLICY IF EXISTS langgraph_writer_insert_store ON langgraph.store;
CREATE POLICY langgraph_writer_insert_store ON langgraph.store FOR INSERT TO langgraph_writer WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_update_store ON langgraph.store;
CREATE POLICY langgraph_writer_update_store ON langgraph.store FOR UPDATE TO langgraph_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS langgraph_writer_delete_store ON langgraph.store;
CREATE POLICY langgraph_writer_delete_store ON langgraph.store FOR DELETE TO langgraph_writer USING (true);
