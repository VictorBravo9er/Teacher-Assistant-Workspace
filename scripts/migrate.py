#!/usr/bin/env python3
"""Database Migration Runner Script

Uses the official Supabase CLI (`npx -y supabase db push`, `migration list`,
and `migration repair`) to apply incremental SQL migrations from
`schema/migrations/` against PostgreSQL. Migration history is tracked natively
by Supabase CLI in `supabase_migrations.schema_migrations` so the `public`
schema is never polluted with custom helper tables.
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Add scripts directory to sys.path for _env_helper and _generate_types
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]


def list_migration_files(migrations_dir: Path) -> list[Path]:
    """Lists all .sql migration files in schema/migrations/ sorted lexicographically."""
    if not migrations_dir.exists():
        return []
    files = [
        f for f in migrations_dir.iterdir() if f.is_file() and f.suffix == ".sql"
    ]
    return sorted(files, key=lambda f: f.name)


def _prepare_supabase_workdir(
    scratch_root: Path, migration_files: list[Path]
) -> Path:
    """Creates an isolated temporary Supabase CLI workdir mirroring schema/migrations/."""
    scratch_root.mkdir(parents=True, exist_ok=True)
    temp_dir = Path(tempfile.mkdtemp(prefix="supabase_mig_", dir=str(scratch_root)))
    supabase_dir = temp_dir / "supabase"
    migrations_out = supabase_dir / "migrations"
    migrations_out.mkdir(parents=True, exist_ok=True)

    _ = (supabase_dir / "config.toml").write_text(
        'project_id = "teach-and-learn"\n', encoding="utf-8"
    )
    for mf in migration_files:
        _ = shutil.copy2(mf, migrations_out / mf.name)

    return temp_dir


def run_migrations(
    status_only: bool = False,
    no_types: bool = False,
) -> int:
    root_dir = Path(__file__).resolve().parent.parent
    migrations_dir = root_dir / "schema" / "migrations"
    scratch_root = root_dir / ".scratch"
    db_url = _env_helper.POSTGRES_URI

    migration_files = list_migration_files(migrations_dir)
    if not migration_files:
        print("📂 No migration files found in schema/migrations/.")
        return 0

    print("=" * 60)
    print("🚀 Teach&Learn Database Migration Tool (Supabase CLI)")
    print("=" * 60)

    workdir = _prepare_supabase_workdir(scratch_root, migration_files)
    try:
        if status_only:
            print("\n📊 Querying migration status via Supabase CLI...")
            cmd_status = [
                "npx",
                "-y",
                "supabase",
                "--workdir",
                str(workdir),
                "migration",
                "list",
                "--db-url",
                db_url,
            ]
            result = subprocess.run(cmd_status, capture_output=True, text=True)
            if result.returncode == 0:
                print(result.stdout.strip())
                print("\n📁 Local Migration File Mapping (schema/migrations/):")
                for f in migration_files:
                    ver = f.name.split("_", 1)[0]
                    print(f"   • {ver}  →  {f.name}")
                return 0
            print(
                f"   ❌ Error listing migrations:\n{result.stderr or result.stdout}",
                file=sys.stderr,
            )
            return 1

        print(
            "\n▶️  Pushing unapplied SQL migrations from schema/migrations/ via Supabase CLI..."
        )
        cmd_push = [
            "npx",
            "-y",
            "supabase",
            "--workdir",
            str(workdir),
            "db",
            "push",
            "--include-all",
            "--db-url",
            db_url,
        ]
        result = subprocess.run(cmd_push, capture_output=True, text=True)
        if result.returncode != 0:
            print(
                f"   ❌ Error applying migrations via Supabase CLI:\n{result.stderr or result.stdout}",
                file=sys.stderr,
            )
            return 1

        output_text = (result.stdout or "").strip()
        if output_text:
            for line in output_text.splitlines():
                print(f"   {line}")
        print("   ✅ Schema migrations synchronized cleanly.")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)

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


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply incremental SQL migrations from schema/migrations/ via Supabase CLI.",
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

    args = parser.parse_args(namespace=_MigrateCLIArgs())
    exit_code = run_migrations(
        status_only=args.status,
        no_types=args.no_types,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
