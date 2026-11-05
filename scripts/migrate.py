#!/usr/bin/env python3
"""Database Migration Runner Script

Uses the official Supabase CLI (`npx -y supabase db push`, `migration list`,
and `migration repair`) to apply incremental SQL migrations from
`supabase/migrations/` against PostgreSQL. Migration history is tracked natively
by Supabase CLI in `supabase_migrations.schema_migrations` so the `public`
schema is never polluted with custom helper tables.
"""

import argparse
import os
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
    quiet: bool = False,
    project_ref: str | None = None,
) -> int:
    root_dir = Path(__file__).resolve().parent.parent
    migrations_dir = root_dir / "supabase" / "migrations"
    resolved_ref = project_ref or _env_helper.resolve_supabase_project_ref()
    use_remote = bool(resolved_ref and os.getenv("SUPABASE_ACCESS_TOKEN"))
    db_url = _env_helper.POSTGRES_URI

    migration_files = list_migration_files(migrations_dir)
    if not migration_files:
        print("📂 No migration files found in supabase/migrations/.")
        return 0

    if not quiet:
        print("=" * 60)
        print("🚀 Didactiq Database Migration Tool (Supabase CLI)")
        print("=" * 60)

    if status_only:
        print("\n📊 Querying migration status via Supabase CLI...")
        cmd_status = [
            "npx",
            "-y",
            "--quiet",
            "supabase",
            "migration",
            "list",
        ]
        if use_remote and resolved_ref:
            cmd_status.extend(["--remote", resolved_ref])
        else:
            cmd_status.extend(["--db-url", db_url])

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

    if not quiet:
        target_desc = (
            f"remote project '{resolved_ref}' via Management API"
            if use_remote and resolved_ref
            else "target database via direct connection"
        )
        print(
            f"\n▶️  Pushing unapplied SQL migrations to {target_desc}..."
        )

    cmd_push = [
        "npx",
        "-y",
        "--quiet",
        "supabase",
        "db",
        "push",
        "--include-all",
    ]
    if use_remote and resolved_ref:
        cmd_push.extend(["--remote", resolved_ref])
    else:
        cmd_push.extend(["--db-url", db_url])

    if yes or quiet:
        cmd_push.append("--yes")

    if quiet:
        result = subprocess.run(cmd_push, cwd=str(root_dir), capture_output=True, text=True)
    else:
        result = subprocess.run(cmd_push, cwd=str(root_dir))

    if result.returncode != 0:
        print(
            "   ❌ Error applying migrations via Supabase CLI.",
            file=sys.stderr,
        )
        if quiet and result.stderr:
            print(result.stderr, file=sys.stderr)
        return result.returncode

    if quiet:
        print(f"   └── Migrations synchronized ({len(migration_files)} local files active, database up to date)")
    else:
        print("   ✅ Schema migrations synchronized cleanly.")

    if not no_types:
        if not quiet:
            print("\n▶️  Regenerating TypeScript and Python contracts...")
        from _generate_types import (  # pyright: ignore[reportImplicitRelativeImport]
            main as generate_types,
        )

        generate_types(db_url, quiet=quiet)

    return 0


class _MigrateCLIArgs(argparse.Namespace):
    status: bool = False
    no_types: bool = False
    yes: bool = False
    project_ref: str | None = None


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
    _ = parser.add_argument(
        "--project-ref",
        type=str,
        default=None,
        help="Supabase project reference ID to target remotely via Management API token.",
    )
    args = parser.parse_args(namespace=_MigrateCLIArgs())

    code = run_migrations(
        status_only=args.status,
        no_types=args.no_types,
        yes=args.yes,
        project_ref=args.project_ref,
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
