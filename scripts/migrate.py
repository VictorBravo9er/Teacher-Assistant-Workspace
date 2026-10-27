#!/usr/bin/env python3
"""Database Migration Runner Script

Uses the official Supabase CLI (`npx -y supabase db push`, `migration list`,
and `migration repair`) to apply incremental SQL migrations from
`supabase/migrations/` against PostgreSQL. Migration history is tracked natively
by Supabase CLI in `supabase_migrations.schema_migrations` so the `public`
schema is never polluted with custom helper tables.
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Add scripts directory to sys.path for _env_helper and _generate_types
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]


def list_migration_files(migrations_dir: Path) -> list[Path]:
    """Lists all .sql migration files in supabase/migrations/ sorted lexicographically."""
    if not migrations_dir.exists():
        return []
    files = [
        f for f in migrations_dir.iterdir() if f.is_file() and f.suffix == ".sql"
    ]
    return sorted(files, key=lambda f: f.name)


def run_migrations(
    status_only: bool = False,
    no_types: bool = False,
    yes: bool = False,
) -> int:
    root_dir = Path(__file__).resolve().parent.parent
    migrations_dir = root_dir / "supabase" / "migrations"
    db_url = _env_helper.POSTGRES_URI

    migration_files = list_migration_files(migrations_dir)
    if not migration_files:
        print("📂 No migration files found in supabase/migrations/.")
        return 0

    print("=" * 60)
    print("🚀 Teach&Learn Database Migration Tool (Supabase CLI)")
    print("=" * 60)

    if status_only:
        print("\n📊 Querying migration status via Supabase CLI...")
        cmd_status = [
            "npx",
            "-y",
            "supabase",
            "migration",
            "list",
            "--db-url",
            db_url,
        ]
        result = subprocess.run(cmd_status, cwd=str(root_dir))
        if result.returncode == 0:
            print("\n📁 Local Migration File Mapping (supabase/migrations/):")
            for f in migration_files:
                ver = f.name.split("_", 1)[0]
                print(f"   • {ver}  →  {f.name}")
            return 0
        print(
            "   ❌ Error listing migrations via Supabase CLI.",
            file=sys.stderr,
        )
        return result.returncode

    print(
        "\n▶️  Pushing unapplied SQL migrations from supabase/migrations/ via Supabase CLI..."
    )
    cmd_push = [
        "npx",
        "-y",
        "supabase",
        "db",
        "push",
        "--include-all",
        "--db-url",
        db_url,
    ]
    if yes:
        cmd_push.insert(5, "--yes")

    result = subprocess.run(cmd_push, cwd=str(root_dir))
    if result.returncode != 0:
        print(
            "   ❌ Error applying migrations via Supabase CLI.",
            file=sys.stderr,
        )
        return result.returncode

    print("   ✅ Schema migrations synchronized cleanly.")

    if not no_types:
        print("\n▶️  Regenerating TypeScript and Python contracts...")
        from _generate_types import (  # pyright: ignore[reportImplicitRelativeImport]
            main as generate_types,
        )

        generate_types(db_url)

    return 0


class _MigrateCLIArgs(argparse.Namespace):
    status: bool = False
    no_types: bool = False
    yes: bool = False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply incremental SQL migrations from supabase/migrations/ via Supabase CLI.",
    )
    _ = parser.add_argument(
        "--status",
        action="store_true",
        help="List applied and pending migrations without executing.",
    )
    _ = parser.add_argument(
        "--no-types",
        action="store_true",
        help="Skip regenerating frontend/backend types after applying migrations.",
    )
    _ = parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip interactive confirmation prompts when pushing migrations.",
    )
    args = parser.parse_args(namespace=_MigrateCLIArgs())

    code = run_migrations(
        status_only=args.status, no_types=args.no_types, yes=args.yes
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
