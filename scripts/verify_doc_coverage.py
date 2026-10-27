#!/usr/bin/env python3
"""Doc Coverage Linter for Teach&Learn.

Mechanically verifies that designated core architectural src directories have a valid code.md
documenting their source code files and data flow contracts.

Supports scoping by subsystem:
  python scripts/verify_doc_coverage.py frontend
  python scripts/verify_doc_coverage.py backend
  python scripts/verify_doc_coverage.py all (default)
"""

from __future__ import annotations

import sys
from pathlib import Path

# Core architectural directories required to maintain code.md
CORE_DIRS_MAP: dict[str, list[str]] = {
    "backend": [
        "backend/src/server",
        "backend/src/service",
        "backend/src/lib",
        "backend/src/types",
    ],
    "frontend": [
        "frontend/src/features/classroom",
        "frontend/src/features/students",
        "frontend/src/features/student-portal",
        "frontend/src/features/ai-assistant",
        "frontend/src/features/calendar",
        "frontend/src/features/account",
        "frontend/src/hooks",
        "frontend/src/services",
        "frontend/src/lib",
        "frontend/src/components",
        "frontend/src/contexts",
    ],
    "schema": [
        "schema",
    ],
    "edge_functions": [
        "supabase/functions",
    ],
}

SOURCE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".py",
    ".sql",
    ".sh",
}

IGNORED_SOURCE_FILES = {
    "vite-env.d.ts",
}


def find_repo_root() -> Path:
    """Resolve repository root."""
    current = Path(__file__).resolve().parent
    while current != current.parent:
        if (current / ".git").exists() or (current / "AGENTS.md").exists():
            return current
        current = current.parent
    return Path.cwd()


def run_audit(root: Path, scope: str = "all") -> int:
    """Audit core architectural directories for code.md coverage."""
    if scope in CORE_DIRS_MAP:
        target_dirs = CORE_DIRS_MAP[scope]
    else:
        target_dirs = [d for group in CORE_DIRS_MAP.values() for d in group]

    errors: list[str] = []
    scanned_dirs = 0
    scanned_files = 0

    for rel_path_str in target_dirs:
        dirpath = root / rel_path_str
        if not dirpath.exists():
            continue

        # Get direct source files in this directory
        code_files = [
            f.name
            for f in dirpath.iterdir()
            if f.is_file()
            and f.suffix.lower() in SOURCE_EXTENSIONS
            and f.name not in IGNORED_SOURCE_FILES
            and not f.name.startswith(".")
        ]

        scanned_dirs += 1
        scanned_files += len(code_files)

        code_md_path = dirpath / "code.md"
        if not code_md_path.exists():
            errors.append(
                f"❌ Missing `code.md` in core directory: `{rel_path_str}`"
            )
            continue

        try:
            content = code_md_path.read_text(encoding="utf-8")
        except Exception as e:
            errors.append(f"❌ Failed to read `{rel_path_str}/code.md`: {e}")
            continue

        # Verify that direct source code files are referenced in code.md
        for code_file in code_files:
            if code_file not in content:
                errors.append(
                    f"❌ Unreferenced source file `{code_file}` in `{rel_path_str}/code.md`"
                )

    print("=" * 70)
    print(f"Teach&Learn Core Documentation Linter (Scope: {scope})")
    print(f"Audited: {scanned_dirs} core directories, {scanned_files} source files")
    print("=" * 70)

    if errors:
        print(f"\nFound {len(errors)} documentation violation(s):\n")
        for err in errors:
            print(f"  {err}")
        print("\nFix missing references or code.md in core directories.\n")
        return 1

    print("\n✅ All core architectural directories and source files are covered by code.md.")
    return 0


if __name__ == "__main__":
    repo_root = find_repo_root()
    audit_scope = sys.argv[1].lower() if len(sys.argv) > 1 else "all"
    sys.exit(run_audit(repo_root, audit_scope))
