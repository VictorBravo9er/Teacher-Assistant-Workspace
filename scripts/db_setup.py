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


import argparse


def run_sql_file(filepath: Path, conn: psycopg.Connection):
    """Executes a SQL file against the Postgres database using psycopg."""
    print(f"\n▶️  Executing SQL file: {filepath.name}...")
    if not filepath.exists():
        print(f"   ❌ Error: File not found at {filepath}", file=sys.stderr)
        raise FileNotFoundError(f"File not found at {filepath}")

    try:
        with conn.cursor() as cur:
            sql = filepath.read_text(encoding="utf-8")
            _ = cur.execute(sql)  # pyright: ignore[reportCallIssue, reportArgumentType, reportUnknownVariableType]
        print(f"   ✅ Successfully executed {filepath.name}")
    except Exception as e:
        print(f"   ❌ Error executing {filepath.name}:\n{e}", file=sys.stderr)
        raise e
    finally:
        _ = conn.commit()


def check_langgraph_configured(conn: psycopg.Connection) -> bool:
    """Checks whether the langgraph checkpoint tables are already present in PostgreSQL."""
    try:
        with conn.cursor() as cur:
            _ = cur.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_schema = 'langgraph' AND table_name = 'checkpoints';"
            )
            return cur.fetchone() is not None
    except Exception:
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Teach&Learn Database Setup & Initialization",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="DESTRUCTIVE: Drop all tables, enums, triggers, and data before re-initializing.",
    )
    parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip interactive confirmation when running with --reset.",
    )
    parser.add_argument(
        "--with-langgraph",
        action="store_true",
        help="Force re-running LangGraph PostgresSaver and PostgresStore table setup.",
    )
    parser.add_argument(
        "--no-types",
        action="store_true",
        help="Skip generating TypeScript and Python types after setup.",
    )

    args = parser.parse_args()
    root_dir = Path(__file__).resolve().parent.parent

    # Interactive confirmation guard for destructive reset
    if args.reset:
        print("\n" + "!" * 60)
        print("⚠️  CRITICAL WARNING: DESTRUCTIVE DATABASE RESET REQUESTED!")
        print("This will DROP all tables, types, triggers, and ERASE ALL DATA!")
        print("!" * 60)
        if not args.yes:
            try:
                confirmation = input(
                    "\nTo proceed, please type 'RESET' exactly: "
                ).strip()
            except (KeyboardInterrupt, EOFError):
                print("\n❌ Operation aborted by user.")
                sys.exit(1)

            if confirmation != "RESET":
                print(
                    "❌ Aborted: Confirmation did not match 'RESET'. No changes made."
                )
                sys.exit(1)

    db_url = _env_helper.POSTGRES_URI
    db_langgraph_url = _env_helper.DB_OPTIONS_URI

    with psycopg.connect(db_url, autocommit=True) as conn:
        schema_reset = root_dir / "schema" / "schema-reset.sql"
        schema_db = root_dir / "schema" / "schema-db.sql"
        bucket_materials = root_dir / "schema" / "bucket-materials.sql"
        bucket_submissions = root_dir / "schema" / "bucket-submissions.sql"
        schema_langgraph = root_dir / "schema" / "schema-langgraph.sql"

        print("=" * 60)
        print(
            "🚀 Starting Database Setup"
            + (" (FULL RESET)" if args.reset else " (Safe Non-Destructive)")
        )
        print("=" * 60)

        # Step 1: Destructive reset ONLY when explicitly requested
        if args.reset:
            run_sql_file(schema_reset, conn)
        else:
            print("🛡️  Skipping destructive schema-reset.sql (data preserved).")

        # Step 2: Main Database Schema & storage buckets (idempotent IF NOT EXISTS)
        run_sql_file(schema_db, conn)
        run_sql_file(bucket_materials, conn)
        run_sql_file(bucket_submissions, conn)

        # Step 3: Run pending incremental migrations from schema/migrations/
        print("\n▶️ Checking incremental schema migrations...")
        import migrate  # pyright: ignore[reportImplicitRelativeImport]

        _ = migrate.run_migrations(no_types=True)

        # Step 4: LangGraph checkpoint tables (only if missing, or reset, or explicitly requested)
        already_has_langgraph = check_langgraph_configured(conn)
        if args.reset or args.with_langgraph or not already_has_langgraph:
            print("\n▶️ Setting up LangGraph checkpoint & store tables...")
            from _setup_langchain_postgres import (  # pyright: ignore[reportImplicitRelativeImport]
                setup_database,
            )

            setup_database(db_langgraph_url)
            run_sql_file(schema_langgraph, conn)
        else:
            print(
                "⏩ LangGraph checkpoint tables already present. Skipping LangGraph setup."
            )

        # Step 5: Generate TS and Python Types via Supabase CLI
        if not args.no_types:
            from _generate_types import (  # pyright: ignore[reportImplicitRelativeImport]
                main as generate_types,
            )

            generate_types(db_url)

    print("\n" + "=" * 60)
    print("🎉 Database Setup Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
