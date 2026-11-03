-- ============================================================================
-- Teach&Learn: Initial Schemas, Extensions, and Roles
-- Timestamp: 20260915100000
-- ============================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Schemas
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS langgraph;

-- 3. Dedicated LangGraph Writer Role
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'langgraph_writer') THEN
    CREATE ROLE langgraph_writer NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA langgraph TO langgraph_writer;
