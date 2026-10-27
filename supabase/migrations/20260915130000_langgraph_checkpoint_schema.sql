-- ============================================================================
-- Teach&Learn: LangGraph Checkpointer & Store Schema Security Setup
-- Timestamp: 20260915130000
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS langgraph;

-- 1. Create Dedicated Writer Role if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'langgraph_writer') THEN
    CREATE ROLE langgraph_writer NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA langgraph TO langgraph_writer;

-- 2. Checkpointer Tables
CREATE TABLE IF NOT EXISTS langgraph.checkpoint_migrations (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS langgraph.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_checkpoint_id TEXT,
    type TEXT,
    checkpoint JSONB NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE TABLE IF NOT EXISTS langgraph.checkpoint_blobs (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL,
    version TEXT NOT NULL,
    type TEXT NOT NULL,
    blob BYTEA,
    PRIMARY KEY (thread_id, checkpoint_ns, channel, version)
);

CREATE TABLE IF NOT EXISTS langgraph.checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    type TEXT,
    blob BYTEA NOT NULL,
    task_path TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

CREATE INDEX IF NOT EXISTS checkpoints_thread_id_idx ON langgraph.checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_blobs_thread_id_idx ON langgraph.checkpoint_blobs(thread_id);
CREATE INDEX IF NOT EXISTS checkpoint_writes_thread_id_idx ON langgraph.checkpoint_writes(thread_id);

-- 3. Store Tables
CREATE TABLE IF NOT EXISTS langgraph.store_migrations (
    v INTEGER PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS langgraph.store (
    prefix text NOT NULL,
    key text NOT NULL,
    value jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    ttl_minutes INT,
    PRIMARY KEY (prefix, key)
);

CREATE INDEX IF NOT EXISTS store_prefix_idx ON langgraph.store USING btree (prefix text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_store_expires_at ON langgraph.store (expires_at) WHERE expires_at IS NOT NULL;

-- 4. Seed Migration History so PostgresSaver & PostgresStore recognize schema version
INSERT INTO langgraph.checkpoint_migrations (v)
VALUES (0), (1), (2), (3), (4), (5), (6), (7), (8), (9)
ON CONFLICT (v) DO NOTHING;

INSERT INTO langgraph.store_migrations (v)
VALUES (0), (1), (2), (3)
ON CONFLICT (v) DO NOTHING;

-- 5. Row Level Security Setup
ALTER TABLE langgraph.checkpoint_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_blobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.checkpoint_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE langgraph.store ENABLE ROW LEVEL SECURITY;

-- 6. Revoke Public / Anon / Authenticated Access
REVOKE ALL ON langgraph.checkpoint_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoints FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_blobs FROM anon, authenticated;
REVOKE ALL ON langgraph.checkpoint_writes FROM anon, authenticated;
REVOKE ALL ON langgraph.store_migrations FROM anon, authenticated;
REVOKE ALL ON langgraph.store FROM anon, authenticated;

-- 7. Grant Permissions to langgraph_writer
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoints TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_blobs TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.checkpoint_writes TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store_migrations TO langgraph_writer;
GRANT SELECT, INSERT, UPDATE, DELETE ON langgraph.store TO langgraph_writer;

-- 8. Policies for langgraph_writer
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
