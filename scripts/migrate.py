#!/usr/bin/env python3
"""Database Migration Runner Script

Applies incremental SQL migrations from schema/migrations/ in sequence,
tracks applied migrations in public._schema_migrations,
and optionally updates TypeScript and Python contracts.
"""

import argparse
import os
import sys
from pathlib import Path

# Automatically re-run using the virtual environment if psycopg is missing.
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
            "❌ Error: 'psycopg' library is not installed and couldn't find backend/.venv virtual environment.",
            file=sys.stderr,
        )
        sys.exit(1)

# Add scripts directory to sys.path for _env_helper and _generate_types
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

MIGRATION_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def ensure_migration_table(conn: psycopg.Connection) -> None:
    """Ensures the _schema_migrations tracking table exists."""
    with conn.cursor() as cur:
        _ = cur.execute(MIGRATION_TABLE_DDL)


def get_applied_migrations(conn: psycopg.Connection) -> set[str]:
    """Returns the set of already applied migration version strings."""
    with conn.cursor() as cur:
        _ = cur.execute("SELECT version FROM public._schema_migrations;")
        rows = cur.fetchall()
        return {str(row[0]) for row in rows}


def list_migration_files(migrations_dir: Path) -> list[Path]:
    """Lists all .sql migration files sorted lexicographically by filename."""
    if not migrations_dir.exists():
        return []
    files = [f for f in migrations_dir.iterdir() if f.is_file() and f.suffix == ".sql"]
    return sorted(files, key=lambda f: f.name)


def run_migrations(
    status_only: bool = False,
    fake: bool = False,
    no_types: bool = False,
) -> int:
    root_dir = Path(__file__).resolve().parent.parent
    migrations_dir = root_dir / "schema" / "migrations"
    db_url = _env_helper.POSTGRES_URI

    migration_files = list_migration_files(migrations_dir)
    if not migration_files:
        print("📂 No migration files found in schema/migrations/.")
        return 0

    print("=" * 60)
    print("🚀 Teach&Learn Database Migration Tool")
    print("=" * 60)

    with psycopg.connect(db_url, autocommit=True) as conn:
        ensure_migration_table(conn)
        applied = get_applied_migrations(conn)

        if status_only:
            print("\n📊 Migration Status:")
            for mf in migration_files:
                version = mf.name.split("_")[0]
                state = "✅ Applied" if version in applied else "⏳ Pending"
                print(f"   [{state}] {mf.name}")
            return 0

        pending_files: list[Path] = []
        for mf in migration_files:
            version = mf.name.split("_")[0]
            if version not in applied:
                pending_files.append(mf)

        if not pending_files:
            print("\n✨ Database schema is up to date! Zero pending migrations.")
            return 0

        print(f"\nFound {len(pending_files)} pending migration(s):")
        for pf in pending_files:
            print(f"   • {pf.name}")

        applied_count = 0
        for pf in pending_files:
            version = pf.name.split("_")[0]
            name = pf.name

            if fake:
                print(f"\n▶️ [FAKE] Marking migration as applied: {name}")
            else:
                print(f"\n▶️ Applying migration: {name}...")
                sql_content = pf.read_text(encoding="utf-8")
                with conn.cursor() as cur:
                    _ = cur.execute(sql_content)

            with conn.cursor() as cur:
                _ = cur.execute(
                    "INSERT INTO public._schema_migrations (version, name) VALUES (%s, %s) ON CONFLICT (version) DO NOTHING;",
                    (version, name),
                )
            print(f"   ✅ Recorded {name}")
            applied_count += 1

        print(f"\n🎉 Successfully applied {applied_count} migration(s).")

    if not no_types and applied_count > 0:
        print("\n" + "=" * 60)
        print("🔄 Regenerating TypeScript and Python types...")
        print("=" * 60)
        from _generate_types import main as generate_types  # pyright: ignore[reportImplicitRelativeImport]

        generate_types(db_url)

    return 0


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Teach&Learn Database Migration Tool",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Display the status of all migrations without applying them.",
    )
    parser.add_argument(
        "--fake",
        action="store_true",
        help="Record pending migrations in the tracking table without executing their SQL.",
    )
    parser.add_argument(
        "--no-types",
        action="store_true",
        help="Skip regenerating TypeScript and Python contracts after migration.",
    )

    args = parser.parse_args()
    sys.exit(
        run_migrations(
            status_only=args.status,
            fake=args.fake,
            no_types=args.no_types,
        )
    )


if __name__ == "__main__":
    main()
