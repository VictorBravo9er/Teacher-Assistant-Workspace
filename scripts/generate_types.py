#!/usr/bin/env python3
"""
Supabase TypeScript and Python Type Generator
Uses the official Supabase CLI to generate types from the database schema.
"""

import subprocess
import sys
from pathlib import Path

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))


def main(db_url: str | None = None):
    root_dir = Path(__file__).resolve().parent.parent

    # Destination files
    ts_file = root_dir / "frontend" / "src" / "types" / "db.ts"
    py_file = root_dir / "backend" / "src" / "types" / "db.py"

    # Make sure target directories exist
    ts_file.parent.mkdir(parents=True, exist_ok=True)
    py_file.parent.mkdir(parents=True, exist_ok=True)

    if not db_url:
        print("Error: POSTGRES_URI environment variable is not set.", file=sys.stderr)
        print(
            "Please set it. Example: export POSTGRES_URI='postgresql://postgres:password@host:5432/postgres'",
            file=sys.stderr,
        )
        raise ValueError("POSTGRES_URI environment variable is not set.")

    # We only generate types for the 'public' schema since 'langgraph' is purely backend-internal memory.
    print("1. Generating TypeScript types for frontend...")
    cmd_ts = [
        "npx",
        "-y",
        "supabase",
        "gen",
        "types",
        "typescript",
        "--db-url",
        db_url,
        "--schema",
        "public",
    ]
    result_ts = subprocess.run(cmd_ts, capture_output=True, text=True)

    if result_ts.returncode == 0:
        with open(ts_file, "w", encoding="utf-8") as f:
            _ = f.write(result_ts.stdout)
        print(f"   ✅ TypeScript types saved to {ts_file.relative_to(root_dir)}")
    else:
        print(
            f"   ❌ Error generating TypeScript types:\n{result_ts.stderr}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    print("\n2. Generating Python types for backend...")
    cmd_py = [
        "npx",
        "-y",
        "supabase",
        "gen",
        "types",
        "--lang=python",
        "--db-url",
        db_url,
        "--schema",
        "public",
    ]
    result_py = subprocess.run(cmd_py, capture_output=True, text=True)

    if result_py.returncode == 0:
        with open(py_file, "w", encoding="utf-8") as f:
            _ = f.write(result_py.stdout)
        print(f"   ✅ Python types saved to {py_file.relative_to(root_dir)}")
    else:
        print(
            f"   ❌ Error generating Python types:\n{result_py.stderr}", file=sys.stderr
        )
        raise SystemExit(1)

    print("\n🎉 Type generation complete!")


if __name__ == "__main__":
    main()
