#!/usr/bin/env python3
"""
Teach&Learn Database Dump Tool (Supabase CLI)

- Schemas: Generates separate local SQL files for each schema (schema.public.sql,
  schema.ai.sql, schema.langgraph.sql in supabase/schemas/).
- Data: Dumps table records for all specified schemas directly into supabase/seed.sql
  (overwriting existing seed fixtures).
"""

import argparse
import subprocess
import sys
from pathlib import Path

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

DEFAULT_SCHEMAS: str = "public,ai,langgraph"
DEFAULT_SCHEMA_DIR: str = "supabase/schemas"
DEFAULT_DATA_FILE: str = "supabase/seed.sql"


class _DBDumpArgs(argparse.Namespace):
    schema_only: bool = False
    data_only: bool = False
    both: bool = False
    schema: str = DEFAULT_SCHEMAS
    dir: Path | None = None
    file: Path | None = None
    db_url: str = _env_helper.POSTGRES_URI
    local: bool = False
    linked: bool = False
    use_copy: bool = False
    keep_comments: bool = False
    dry_run: bool = False


def _run_supabase_dump(
    mode: str,
    output_file: Path,
    schemas: str = DEFAULT_SCHEMAS,
    db_url: str | None = None,
    local: bool = False,
    linked: bool = False,
    use_copy: bool = False,
    keep_comments: bool = False,
    dry_run: bool = False,
) -> int:
    """Internal helper to execute `supabase db dump`."""
    root_dir = Path(__file__).resolve().parent.parent

    cmd: list[str] = ["npx", "-y", "supabase", "db", "dump"]

    if local:
        cmd.append("--local")
    elif linked:
        cmd.append("--linked")
    elif db_url:
        cmd.extend(["--db-url", db_url])
    else:
        print(
            "❌ Error: No database target specified. Missing POSTGRES_URI or --local/--linked flag.",
            file=sys.stderr,
        )
        return 1

    cmd.extend(["--schema", schemas])

    if mode == "data":
        cmd.append("--data-only")
        if use_copy:
            cmd.append("--use-copy")

    if keep_comments:
        cmd.append("--keep-comments")

    if dry_run:
        cmd.append("--dry-run")
    else:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        cmd.extend(["-f", str(output_file)])

    kind_label = "table data" if mode == "data" else "DDL schema"
    target_label = (
        "local container"
        if local
        else ("linked project" if linked else "configured database")
    )
    print(
        f"\n▶️  Generating local SQL file for [{schemas}] ({kind_label}) from {target_label}..."
    )
    if not dry_run:
        try:
            rel_path = output_file.relative_to(root_dir)
        except ValueError:
            rel_path = output_file
        print(f"   Destination: {rel_path}")

    result = subprocess.run(cmd, cwd=str(root_dir))
    if result.returncode != 0:
        print(
            f"   ❌ Error generating {kind_label} for [{schemas}] via Supabase CLI (exit {result.returncode}).",
            file=sys.stderr,
        )
        return result.returncode

    if not dry_run:
        print(
            f"   ✅ Successfully generated local SQL file: {output_file.name}"
        )
    return 0


def dump_schemas(
    db_url: str | None = None,
    output_dir: Path | None = None,
    schemas: str = DEFAULT_SCHEMAS,
    file_override: Path | None = None,
    local: bool = False,
    linked: bool = False,
    keep_comments: bool = False,
    dry_run: bool = False,
) -> int:
    """Generates separate local DDL schema SQL files for each specified schema."""
    root_dir = Path(__file__).resolve().parent.parent
    target_dir = (
        output_dir if output_dir is not None else (root_dir / DEFAULT_SCHEMA_DIR)
    )
    schema_list = [s.strip() for s in schemas.split(",") if s.strip()]

    for s in schema_list:
        if file_override is not None:
            if "{schema}" in str(file_override):
                target_file = Path(str(file_override).format(schema=s))
            elif len(schema_list) == 1:
                target_file = file_override
            else:
                target_file = (
                    file_override.parent
                    / f"{file_override.stem}_{s}{file_override.suffix}"
                )
        else:
            target_file = target_dir / f"schema.{s}.sql"

        rc = _run_supabase_dump(
            mode="schema",
            output_file=target_file,
            schemas=s,
            db_url=db_url if db_url is not None else _env_helper.POSTGRES_URI,
            local=local,
            linked=linked,
            keep_comments=keep_comments,
            dry_run=dry_run,
        )
        if rc != 0:
            return rc
    return 0


def dump_data(
    db_url: str | None = None,
    output_file: Path | None = None,
    schemas: str = DEFAULT_SCHEMAS,
    local: bool = False,
    linked: bool = False,
    use_copy: bool = False,
    keep_comments: bool = False,
    dry_run: bool = False,
) -> int:
    """Dumps table data for the specified schemas directly into seed.sql (overwrites)."""
    root_dir = Path(__file__).resolve().parent.parent
    target_file = (
        output_file if output_file is not None else (root_dir / DEFAULT_DATA_FILE)
    )

    return _run_supabase_dump(
        mode="data",
        output_file=target_file,
        schemas=schemas,
        db_url=db_url if db_url is not None else _env_helper.POSTGRES_URI,
        local=local,
        linked=linked,
        use_copy=use_copy,
        keep_comments=keep_comments,
        dry_run=dry_run,
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Teach&Learn Database Dump Tool (Supabase CLI)",
    )
    group = parser.add_mutually_exclusive_group()
    _ = group.add_argument(
        "--schema-only",
        action="store_true",
        help="Dump separate DDL schema files (default).",
    )
    _ = group.add_argument(
        "--data-only",
        action="store_true",
        help="Dump table data into seed.sql.",
    )
    _ = group.add_argument(
        "--both",
        action="store_true",
        help="Dump both separate DDL schemas and data into seed.sql.",
    )
    _ = parser.add_argument(
        "-s",
        "--schema",
        default=DEFAULT_SCHEMAS,
        help=f"Comma-separated list of schemas to dump (default: '{DEFAULT_SCHEMAS}').",
    )
    _ = parser.add_argument(
        "-d",
        "--dir",
        type=Path,
        default=None,
        help="Destination directory for schema SQL files. Defaults to supabase/schemas.",
    )
    _ = parser.add_argument(
        "-f",
        "--file",
        type=Path,
        default=None,
        help="Destination file path for data dump (defaults to supabase/seed.sql).",
    )
    _ = parser.add_argument(
        "--db-url",
        default=_env_helper.POSTGRES_URI,
        help="Direct Postgres connection URL. Defaults to POSTGRES_URI from environment.",
    )
    _ = parser.add_argument(
        "--local",
        action="store_true",
        help="Dump from local running Supabase container instead of remote URL.",
    )
    _ = parser.add_argument(
        "--linked",
        action="store_true",
        help="Dump from linked Supabase project.",
    )
    _ = parser.add_argument(
        "--use-copy",
        action="store_true",
        help="Use COPY statements instead of INSERT statements for data dump.",
    )
    _ = parser.add_argument(
        "--keep-comments",
        action="store_true",
        help="Keep commented lines in the dumped output.",
    )
    _ = parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the pg_dump command that would be executed without writing files.",
    )

    args = parser.parse_args(namespace=_DBDumpArgs())

    print("=" * 60)
    print("📦 Teach&Learn Database Dump Tool (Supabase CLI)")
    print("=" * 60)

    if args.both:
        rc = dump_schemas(
            db_url=args.db_url,
            output_dir=args.dir,
            schemas=args.schema,
            file_override=args.file,
            local=args.local,
            linked=args.linked,
            keep_comments=args.keep_comments,
            dry_run=args.dry_run,
        )
        if rc != 0:
            sys.exit(rc)

        rc = dump_data(
            db_url=args.db_url,
            output_file=args.file,
            schemas=args.schema,
            local=args.local,
            linked=args.linked,
            use_copy=args.use_copy,
            keep_comments=args.keep_comments,
            dry_run=args.dry_run,
        )
        if rc != 0:
            sys.exit(rc)
    else:
        if args.data_only:
            rc = dump_data(
                db_url=args.db_url,
                output_file=args.file,
                schemas=args.schema,
                local=args.local,
                linked=args.linked,
                use_copy=args.use_copy,
                keep_comments=args.keep_comments,
                dry_run=args.dry_run,
            )
        else:
            rc = dump_schemas(
                db_url=args.db_url,
                output_dir=args.dir,
                schemas=args.schema,
                file_override=args.file,
                local=args.local,
                linked=args.linked,
                keep_comments=args.keep_comments,
                dry_run=args.dry_run,
            )

        if rc != 0:
            sys.exit(rc)

    print("\n" + "=" * 60)
    print("🎉 Dump Operation Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
