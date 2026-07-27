#!/usr/bin/env python3
"""
Database Reset and Initialization Script
Runs the sequence of SQL and Python scripts to fully reset and type-check the Supabase database.
"""

import os
import sys
from pathlib import Path

# Automatically re-run the script using the virtual environment if psycopg is missing.
try:
    import psycopg
except ImportError:
    root_dir = Path(__file__).resolve().parent.parent
    venv_python = root_dir / "backend" / ".venv" / "bin" / "python"
    print(f"setting root dir: {root_dir}")
    print(f"setting python binary: {venv_python}")

    if venv_python.exists() and sys.executable != str(venv_python):
        print(f"🔄 Relaunching script using python binary: {venv_python}")
        os.execv(str(venv_python), [str(venv_python)] + sys.argv)
    else:
        print(
            "❌ Error: 'psycopg' library is not installed and couldn't find .uv_python virtual environment.",
            file=sys.stderr,
        )
        sys.exit(1)

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

exit(code=0)


def run_sql_file(filepath: Path, conn: psycopg.Connection):
    """Executes a SQL file against the Postgres database using psycopg."""
    print(f"\n▶️  Executing SQL file: {filepath.name}...")
    if not filepath.exists():
        print(f"   ❌ Error: File not found at {filepath}", file=sys.stderr)
        raise FileNotFoundError(f"File not found at {filepath}")

    try:
        # Connect with autocommit=True so DDL/schema commands execute properly without transaction block errors
        with conn.cursor() as cur:
            sql = filepath.read_text(encoding="utf-8")
            _ = cur.execute(sql)  # pyright: ignore[reportCallIssue, reportArgumentType, reportUnknownVariableType]
        print(f"   ✅ Successfully executed {filepath.name}")
    except Exception as e:
        print(f"   ❌ Error executing {filepath.name}:\n{e}", file=sys.stderr)
        raise e
    finally:
        _ = conn.commit()


def main():
    root_dir = Path(__file__).resolve().parent.parent

    # Use _env_helper.py to get POSTGRES_URI
    db_url = _env_helper.POSTGRES_URI
    db_langgraph_url = _env_helper.DB_OPTIONS_URI

    with psycopg.connect(db_url, autocommit=True) as conn:
        # Define the exact sequence of files to execute
        schema_reset = root_dir / "schema" / "schema-reset.sql"
        schema_db = root_dir / "schema" / "schema-db.sql"
        schema_langgraph = root_dir / "schema" / "schema-langgraph.sql"

        print("=" * 60)
        print("🚀 Starting Database Reset and Initialization")
        print("=" * 60)

        # Step 1: Drop previous DB state
        run_sql_file(schema_reset, conn)

        # Step 2: Main Database Schema
        run_sql_file(schema_db, conn)

        # Step 3: LangChain / LangGraph setup (creates schemas/tables using Python)
        from setup_langchain_postgres import (  # pyright: ignore[reportImplicitRelativeImport]
            setup_database,
        )

        setup_database(db_langgraph_url)

        # Step 4: LangGraph RLS and Security constraints
        run_sql_file(schema_langgraph, conn)

        # Step 5: Generate TS and Python Types via Supabase CLI
        from generate_types import (  # pyright: ignore[reportImplicitRelativeImport]
            main as generate_types,
        )

        generate_types(db_url)

    print("\n" + "=" * 60)
    print("🎉 Database Reset and Initialization Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
