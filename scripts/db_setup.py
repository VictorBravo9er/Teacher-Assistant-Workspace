#!/usr/bin/env python3
"""Teach&Learn Database Setup & Initialization Orchestrator

Executes the database setup sequence:
  Phase 1: Database teardown (if --reset) & LangGraph storage verification (Serial Gate 1)
  Phase 2: Incremental SQL migration synchronization (Supabase CLI) (Serial Gate 2)
  Phase 3: Top-level concurrent pipeline (ThreadPoolExecutor):
           • Worker 1: Edge Functions deployment audit & sync
           • Worker 2: TypeScript contract generation & Enum tooltip audit
           • Worker 3: Python contract generation
           • Workers 4–6: Concurrent DDL schema dumps (public, ai, langgraph)
"""

from __future__ import annotations

import argparse
import os
import sys
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import TextIO

# Automatically re-run the script using the virtual environment if psycopg is missing.
try:
    import psycopg
except ImportError:
    import shutil

    root_dir = Path(__file__).resolve().parent.parent
    venv_python = root_dir / "backend" / ".venv" / "bin" / "python"

    if venv_python.exists() and sys.executable != str(venv_python):
        print(f"🔄 Relaunching script using backend virtualenv: {venv_python}")
        os.execv(str(venv_python), [str(venv_python)] + sys.argv)

    uv_bin = shutil.which("uv")
    if uv_bin:
        print("🔄 Relaunching script using 'uv run' for backend environment...")
        os.execv(
            uv_bin,
            [
                uv_bin,
                "run",
                "--project",
                str(root_dir / "backend"),
                "python",
                str(Path(__file__).resolve()),
            ]
            + sys.argv[1:],
        )

    print(
        "❌ Error: 'psycopg' library is not installed and backend virtual environment was not found.\n"
        + "   Please run 'uv sync' in backend/ or run with 'uv run --project backend python scripts/db_setup.py'.",
        file=sys.stderr,
    )
    sys.exit(1)

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

_log_lock = threading.Lock()


def safe_print(*args: object, file: TextIO | None = None) -> None:
    """Thread-safe terminal printing to prevent interleaved worker output."""
    with _log_lock:
        print(*args, file=file)


class UI:
    """Terminal styling helpers with auto TTY detection and clean Unicode borders."""

    _enabled: bool = sys.stdout.isatty() and not os.environ.get("NO_COLOR")

    RESET: str = "\033[0m" if _enabled else ""
    BOLD: str = "\033[1m" if _enabled else ""
    DIM: str = "\033[2m" if _enabled else ""
    CYAN: str = "\033[36m" if _enabled else ""
    GREEN: str = "\033[32m" if _enabled else ""
    YELLOW: str = "\033[33m" if _enabled else ""
    BLUE: str = "\033[34m" if _enabled else ""
    MAGENTA: str = "\033[35m" if _enabled else ""
    RED: str = "\033[31m" if _enabled else ""
    WHITE: str = "\033[37m" if _enabled else ""

    @classmethod
    def header_card(cls, title: str, subtitle: str, width: int = 72) -> str:
        border_top = "┌" + "─" * (width - 2) + "┐"
        border_bot = "└" + "─" * (width - 2) + "┘"
        line1 = f"│  {cls.BOLD}{cls.CYAN}{title}{cls.RESET}"
        line1 += " " * max(1, width - len(title) - 4) + "│"
        line2 = f"│  {cls.DIM}{subtitle}{cls.RESET}"
        line2 += " " * max(1, width - len(subtitle) - 4) + "│"
        return f"{cls.CYAN}{border_top}\n{line1}\n{line2}\n{cls.CYAN}{border_bot}{cls.RESET}"

    @classmethod
    def step(cls, num: int, total: int, icon: str, title: str) -> None:
        badge = f"{cls.BOLD}{cls.BLUE}[{num}/{total}]{cls.RESET}"
        safe_print(f"\n{badge} {icon}  {cls.BOLD}{title}{cls.RESET}")

    @classmethod
    def summary_box(
        cls,
        title: str,
        items: list[tuple[str, str, str]],
        elapsed_sec: float,
        width: int = 72,
    ) -> None:
        border_top = "┌" + "─" * (width - 2) + "┐"
        border_sep = "├" + "─" * (width - 2) + "┤"
        border_bot = "└" + "─" * (width - 2) + "┘"
        timing_str = f"(Elapsed: {elapsed_sec:.1f}s)"
        header = f"│  {cls.BOLD}{cls.GREEN}{title}{cls.RESET} {cls.DIM}{timing_str}{cls.RESET}"
        header += " " * max(1, width - len(title) - len(timing_str) - 5) + "│"

        safe_print(f"\n{cls.GREEN}{border_top}")
        safe_print(header)
        safe_print(border_sep)
        for status_icon, label, value in items:
            row = f"│  {status_icon}  {cls.BOLD}{label:<22}{cls.RESET} {cls.DIM}{value}{cls.RESET}"
            visible_len = len(f"  {status_icon}  {label:<22} {value}")
            padding = " " * max(1, width - visible_len - 1)
            safe_print(f"{row}{padding}│")
        safe_print(f"{border_bot}{cls.RESET}\n")


def run_sql_file(
    filepath: Path, conn: psycopg.Connection[tuple[object, ...]]
) -> None:
    """Executes a SQL file against the Postgres database using psycopg."""
    if not filepath.exists():
        safe_print(f"   ❌ Error: File not found at {filepath}", file=sys.stderr)
        raise FileNotFoundError(f"File not found at {filepath}")

    try:
        with conn.cursor() as cur:
            sql = filepath.read_text(encoding="utf-8")
            _ = cur.execute(sql)  # pyright: ignore[reportCallIssue, reportArgumentType, reportUnknownVariableType]
        safe_print(f"   ├── Executed teardown: {filepath.name}")
    except Exception as e:
        safe_print(
            f"   ❌ Error executing {filepath.name}:\n{e}", file=sys.stderr
        )
        raise e
    finally:
        _ = conn.commit()


def check_langgraph_configured(
    conn: psycopg.Connection[tuple[object, ...]],
) -> bool:
    """Checks whether the langgraph checkpoint tables are already present in PostgreSQL."""
    try:
        with conn.cursor() as cur:
            _ = cur.execute(
                "SELECT 1 FROM information_schema.tables WHERE table_schema = 'langgraph' AND table_name = 'checkpoints';"
            )
            return cur.fetchone() is not None
    except Exception:
        return False


class _DBSetupArgs(argparse.Namespace):
    reset: bool = False
    yes: bool = False
    with_langgraph: bool = False
    no_types: bool = False
    no_functions: bool = False
    force_functions: bool = False
    no_dump: bool = False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Teach&Learn Database Setup & Initialization",
    )
    _ = parser.add_argument(
        "--reset",
        action="store_true",
        help="DESTRUCTIVE: Drop all tables, enums, triggers, and data before re-initializing.",
    )
    _ = parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Skip interactive confirmation when running with --reset.",
    )
    _ = parser.add_argument(
        "--with-langgraph",
        action="store_true",
        help="Force re-running LangGraph PostgresSaver and PostgresStore table setup.",
    )
    _ = parser.add_argument(
        "--no-types",
        action="store_true",
        help="Skip generating TypeScript and Python types after setup.",
    )
    _ = parser.add_argument(
        "--no-functions",
        action="store_true",
        help="Skip deploying modified Supabase Edge Functions.",
    )
    _ = parser.add_argument(
        "--force-functions",
        action="store_true",
        help="Force redeploying all Supabase Edge Functions even if unmodified.",
    )
    _ = parser.add_argument(
        "--no-dump",
        action="store_true",
        help="Skip generating local SQL schema files after setup.",
    )

    args = parser.parse_args(namespace=_DBSetupArgs())
    root_dir = Path(__file__).resolve().parent.parent

    # Interactive confirmation guard for destructive reset
    if args.reset:
        safe_print("\n" + "!" * 72)
        safe_print("⚠️  CRITICAL WARNING: DESTRUCTIVE DATABASE RESET REQUESTED!")
        safe_print("This will DROP all tables, types, triggers, and ERASE ALL DATA!")
        safe_print("!" * 72)
        if not args.yes:
            try:
                confirmation = input(
                    "\nTo proceed, please type 'RESET' exactly: "
                ).strip()
            except (KeyboardInterrupt, EOFError):
                safe_print("\n❌ Operation aborted by user.")
                sys.exit(1)

            if confirmation != "RESET":
                safe_print(
                    "❌ Aborted: Confirmation did not match 'RESET'. No changes made."
                )
                sys.exit(1)

    db_url = _env_helper.POSTGRES_URI
    db_langgraph_url = _env_helper.DB_OPTIONS_URI

    # Parse host for subtitle
    parsed = urllib.parse.urlparse(db_url)
    db_host = parsed.hostname or "localhost"
    project_ref = _env_helper.resolve_supabase_project_ref()
    target_info = f"Host: {db_host}" + (f" ({project_ref})" if project_ref else "")
    mode_str = "Destructive Teardown & Reset" if args.reset else "Safe Non-Destructive"

    safe_print()
    safe_print(
        UI.header_card(
            title=f"Teach&Learn — Database Setup Orchestrator ({mode_str})",
            subtitle=f"Target: {target_info}",
        )
    )

    start_time = time.time()
    step_results: list[tuple[str, str, str]] = []

    with psycopg.connect(db_url, autocommit=True) as conn:
        schema_reset = root_dir / "supabase" / "schemas" / "schema-reset.sql"

        # ------------------------------------------------------------------
        # Phase 1: Teardown & LangGraph Storage Checkpoint (Serial Gate 1)
        # ------------------------------------------------------------------
        if args.reset:
            UI.step(1, 3, "⚠️", "Database Teardown & LangGraph Provisioning")
            run_sql_file(schema_reset, conn)

            from _setup_langchain_postgres import (  # pyright: ignore[reportImplicitRelativeImport]
                setup_database,
            )

            setup_database(db_langgraph_url, quiet=True)
            safe_print(
                "   └── LangGraph tables: Initialized checkpoint & store tables"
            )
            step_results.append(
                ("✔", "LangGraph Storage", "Re-initialized in schema 'langgraph'")
            )
        else:
            UI.step(1, 3, "🛡️", "Database Preparation & LangGraph Storage")
            safe_print(
                "   ├── Safe mode: schema-reset.sql skipped (data preserved)"
            )
            from _setup_langchain_postgres import (  # pyright: ignore[reportImplicitRelativeImport]
                setup_database,
            )

            if args.with_langgraph or not check_langgraph_configured(conn):
                setup_database(db_langgraph_url, quiet=True)
                safe_print(
                    "   └── LangGraph tables: Created missing checkpoint & store tables"
                )
                step_results.append(
                    (
                        "✔",
                        "LangGraph Storage",
                        "Created missing tables in 'langgraph'",
                    )
                )
            else:
                safe_print(
                    "   └── LangGraph tables: Verified in schema 'langgraph'"
                )
                step_results.append(
                    ("✔", "LangGraph Storage", "Verified in schema 'langgraph'")
                )

        # ------------------------------------------------------------------
        # Phase 2: Synchronize migrations via Supabase CLI (Serial Gate 2)
        # ------------------------------------------------------------------
        UI.step(2, 3, "🔄", "Schema Migrations (Supabase CLI)")
        import migrate  # pyright: ignore[reportImplicitRelativeImport]

        rc_migrate = migrate.run_migrations(
            no_types=True, yes=args.yes, quiet=True
        )
        if rc_migrate != 0:
            step_results.append(
                ("✖", "Schema Migrations", "Failed to synchronize")
            )
            elapsed = time.time() - start_time
            UI.summary_box(
                title="Teach&Learn — Database Setup Failed",
                items=step_results,
                elapsed_sec=elapsed,
            )
            sys.exit(rc_migrate)
        else:
            step_results.append(
                (
                    "✔",
                    "Schema Migrations",
                    "Synchronized cleanly via Supabase CLI",
                )
            )

        # ------------------------------------------------------------------
        # Phase 3: Top-Level Concurrent Pipeline (Tier 1 Concurrency)
        # ------------------------------------------------------------------
        UI.step(
            3,
            3,
            "⚡",
            "Concurrent Pipeline (Edge Functions, Types & DDL Schemas)",
        )
        safe_print(
            "   ├── Launching concurrent workers for post-migration tasks..."
        )

        from _generate_types import (  # pyright: ignore[reportImplicitRelativeImport]
            generate_python_types,
            generate_typescript_types,
        )
        from _verify_enum_tooltips import (  # pyright: ignore[reportImplicitRelativeImport]
            audit_enum_tooltips,
        )
        from db_dump import (  # pyright: ignore[reportImplicitRelativeImport]
            dump_schemas,
        )
        from deploy_edge_functions import (  # pyright: ignore[reportImplicitRelativeImport]
            deploy_modified_functions,
        )

        def _worker_functions() -> tuple[str, bool, str]:
            if args.no_functions:
                return "Edge Functions", True, "Skipped (--no-functions)"
            rc = deploy_modified_functions(
                force=bool(args.force_functions),
                quiet=True,
                concurrency=4,
                yes=args.yes,
            )
            if rc == 0:
                return "Edge Functions", True, "Up to date (audit clean)"
            return "Edge Functions", False, "Errors encountered during sync"

        def _worker_ts_types() -> tuple[str, bool, str]:
            if args.no_types:
                return "TypeScript Types", True, "Skipped (--no-types)"
            _ = generate_typescript_types(db_url, quiet=True)
            _ = audit_enum_tooltips(quiet=True)
            return "TypeScript Types", True, "frontend/src/types/db.ts updated"

        def _worker_py_types() -> tuple[str, bool, str]:
            if args.no_types:
                return "Python Types", True, "Skipped (--no-types)"
            _ = generate_python_types(db_url, quiet=True)
            return "Python Types", True, "backend/src/types/db.py updated"

        def _worker_dump_schema(schema_name: str) -> tuple[str, bool, str]:
            if args.no_dump:
                return (
                    f"Schema ({schema_name})",
                    True,
                    "Skipped (--no-dump)",
                )
            rc = dump_schemas(
                db_url=db_url,
                schemas=schema_name,
                quiet=True,
                parallel=False,
            )
            if rc == 0:
                return (
                    f"Schema ({schema_name})",
                    True,
                    f"schema.{schema_name}.sql updated",
                )
            return (
                f"Schema ({schema_name})",
                False,
                f"Failed to dump schema.{schema_name}.sql",
            )

        worker_tasks = {
            "functions": _worker_functions,
            "ts_types": _worker_ts_types,
            "py_types": _worker_py_types,
            "dump_public": lambda: _worker_dump_schema("public"),
            "dump_ai": lambda: _worker_dump_schema("ai"),
            "dump_langgraph": lambda: _worker_dump_schema("langgraph"),
        }

        with ThreadPoolExecutor(max_workers=6) as executor:
            futures = {
                executor.submit(task_fn): key
                for key, task_fn in worker_tasks.items()
            }

            results_map: dict[str, tuple[str, bool, str]] = {}
            for future in as_completed(futures):
                key = futures[future]
                try:
                    label, success, detail = future.result()
                    results_map[key] = (label, success, detail)
                    status_badge = "✅" if success else "❌"
                    safe_print(f"   {status_badge} Completed: {label} ({detail})")
                except Exception as exc:
                    results_map[key] = (key, False, str(exc))
                    safe_print(
                        f"   ❌ Error in worker {key}: {exc}", file=sys.stderr
                    )

        # Consolidate results for summary box
        fn_res = results_map.get("functions", ("Edge Functions", False, "Error"))
        ts_res = results_map.get("ts_types", ("TypeScript Types", False, "Error"))
        py_res = results_map.get("py_types", ("Python Types", False, "Error"))

        step_results.append(
            ("✔" if fn_res[1] else "✖", "Edge Functions", fn_res[2])
        )
        step_results.append(
            (
                "✔" if (ts_res[1] and py_res[1]) else "✖",
                "Type Contracts",
                "TypeScript & Python contracts updated"
                if not args.no_types
                else "Skipped (--no-types)",
            )
        )

        all_schemas_ok = (
            results_map.get("dump_public", ("", False, ""))[1]
            and results_map.get("dump_ai", ("", False, ""))[1]
            and results_map.get("dump_langgraph", ("", False, ""))[1]
        )
        step_results.append(
            (
                "✔" if all_schemas_ok else "✖",
                "Local Schemas",
                "schema.<name>.sql dumps updated"
                if not args.no_dump
                else "Skipped (--no-dump)",
            )
        )

    elapsed = time.time() - start_time
    UI.summary_box(
        title="Teach&Learn — Database Setup Complete",
        items=step_results,
        elapsed_sec=elapsed,
    )


if __name__ == "__main__":
    main()
