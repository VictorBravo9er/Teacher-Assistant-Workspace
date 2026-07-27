#!/usr/bin/env python3
"""
Database Reset and Initialization Script
Runs the sequence of SQL and Python scripts to fully reset and type-check the Supabase database.
"""

import os
import subprocess
import sys
from pathlib import Path

# Automatically re-run the script using the virtual environment if psycopg is missing.
try:
    import psycopg
except ImportError:
    root_dir = Path(__file__).resolve().parent.parent
    venv_python = root_dir / ".uv_python" / "bin" / "python"

    if venv_python.exists() and sys.executable != str(venv_python):
        print(f"🔄 Relaunching script using virtual environment: {venv_python}")
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


def run_sql_file(db_url: str, filepath: Path):
    """Executes a SQL file against the Postgres database using psycopg."""
    print(f"\n▶️  Executing SQL file: {filepath.name}...")
    if not filepath.exists():
        print(f"   ❌ Error: File not found at {filepath}", file=sys.stderr)
        sys.exit(1)

    try:
        # Connect with autocommit=True so DDL/schema commands execute properly without transaction block errors
        with psycopg.connect(db_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                sql = filepath.read_text(encoding="utf-8")
                _ = cur.execute(sql)  # pyright: ignore[reportCallIssue, reportArgumentType]
        print(f"   ✅ Successfully executed {filepath.name}")
    except Exception as e:
        print(f"   ❌ Error executing {filepath.name}:\n{e}", file=sys.stderr)
        sys.exit(1)


def run_python_script(filepath: Path):
    """Runs a Python script using the current python executable."""
    print(f"\n▶️  Running script: {filepath.name}...")
    if not filepath.exists():
        print(f"   ❌ Error: File not found at {filepath}", file=sys.stderr)
        sys.exit(1)

    # Use sys.executable to ensure we use the same Python environment
    result = subprocess.run([sys.executable, str(filepath)], capture_output=False)

    if result.returncode == 0:
        print(f"   ✅ Successfully ran {filepath.name}")
    else:
        print(
            f"   ❌ Error running {filepath.name} (Exit code: {result.returncode}). Exiting.",
            file=sys.stderr,
        )
        sys.exit(result.returncode)


def main():
    root_dir = Path(__file__).resolve().parent.parent

    # Use _env_helper.py to get POSTGRES_URI
    db_url = _env_helper.POSTGRES_URI

    # Define the exact sequence of files to execute
    schema_reset = root_dir / "schema" / "schema-reset.sql"
    schema_db = root_dir / "schema" / "schema-db.sql"
    setup_langchain = root_dir / "scripts" / "setup_langchain_postgres.py"
    schema_langgraph = root_dir / "schema" / "schema-langgraph.sql"
    generate_types = root_dir / "scripts" / "generate_types.py"

    print("=" * 60)
    print("🚀 Starting Database Reset and Initialization")
    print("=" * 60)

    # Step 1: Drop previous DB state
    run_sql_file(db_url, schema_reset)

    # Step 2: Main Database Schema
    run_sql_file(db_url, schema_db)

    # Step 3: LangChain / LangGraph setup (creates schemas/tables using Python)
    run_python_script(setup_langchain)

    # Step 4: LangGraph RLS and Security constraints
    run_sql_file(db_url, schema_langgraph)

    # Step 5: Generate TS and Python Types via Supabase CLI
    run_python_script(generate_types)

    print("\n" + "=" * 60)
    print("🎉 Database Reset and Initialization Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
