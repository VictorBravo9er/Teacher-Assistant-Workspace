#!/usr/bin/env python3
"""Doc Coverage Linter for Teach&Learn.

Mechanically verifies that:
1. Every non-exempt directory containing source code has both code.DESC.md and code.ARCH.md.
2. Every source file (.ts, .tsx, .py, .sql, .sh) is explicitly referenced by name in its
   parent directory's code.DESC.md.
3. Exits with non-zero status and itemized actionable errors if any file is missing from docs.

Zero token overhead. Deterministic mechanical gate.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

# Directories strictly exempted per AGENTS.md §3.2
EXEMPT_DIR_NAMES = {
    ".git",
    ".scratch",
    ".venv",
    ".vercel",
    "__pycache__",
    "assets",
    "dist",
    "docs",
    "node_modules",
    "plans",
    "public",
    "systems",
}

# Specific namespace-only paths exempted (e.g., supabase/ root namespace, while supabase/functions/ is checked)
EXEMPT_EXACT_PATHS = {
    "supabase",
}

# Relevant source code extensions
SOURCE_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".py",
    ".sql",
    ".sh",
}

# Specific source files to ignore from required description (e.g. build configs or internal artifacts)
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


def is_exempt_dir(rel_path: Path) -> bool:
    """Check if directory is exempt from micro-docs requirements."""
    rel_str = str(rel_path).replace("\\", "/")
    if rel_str in EXEMPT_EXACT_PATHS:
        return True
    for part in rel_path.parts:
        if part in EXEMPT_DIR_NAMES or part.startswith("."):
            return True
    return False


def run_audit(root: Path) -> int:
    """Perform deterministic micro-docs coverage audit."""
    errors: list[str] = []
    scanned_dirs = 0
    scanned_files = 0

    for dirpath, dirnames, filenames in os.walk(root):
        rel_dir = Path(dirpath).relative_to(root)
        if is_exempt_dir(rel_dir):
            # Prune directory from traversal
            dirnames[:] = [d for d in dirnames if not is_exempt_dir(rel_dir / d)]
            continue

        # Find direct source code files in this directory
        code_files = [
            f
            for f in filenames
            if Path(f).suffix.lower() in SOURCE_EXTENSIONS
            and f not in IGNORED_SOURCE_FILES
            and not f.startswith(".")
        ]

        if not code_files:
            continue

        scanned_dirs += 1
        scanned_files += len(code_files)

        desc_path = Path(dirpath) / "code.DESC.md"
        arch_path = Path(dirpath) / "code.ARCH.md"

        # Check existence of code.DESC.md
        if not desc_path.exists():
            errors.append(
                f"❌ Missing `code.DESC.md` in directory: `{rel_dir}` (Contains {len(code_files)} source files: {', '.join(code_files[:3])}...)"
            )
            desc_content = ""
        else:
            try:
                desc_content = desc_path.read_text(encoding="utf-8")
            except Exception as e:
                errors.append(f"❌ Failed to read `{rel_dir}/code.DESC.md`: {e}")
                desc_content = ""

        # Check existence of code.ARCH.md
        if not arch_path.exists():
            errors.append(
                f"❌ Missing `code.ARCH.md` in directory: `{rel_dir}` (Required per AGENTS.md §3.2)"
            )

        # Check that each source file is referenced in code.DESC.md
        if desc_content:
            for code_file in code_files:
                if code_file not in desc_content:
                    errors.append(
                        f"❌ Unreferenced source file `{code_file}` in `{rel_dir}/code.DESC.md`"
                    )

    print("=" * 70)
    print("Teach&Learn Documentation Coverage Linter")
    print(f"Scanned: {scanned_dirs} code directories, {scanned_files} source files")
    print("=" * 70)

    if errors:
        print(f"\nFound {len(errors)} documentation coverage violation(s):\n")
        for err in errors:
            print(f"  {err}")
        print("\nFix all missing references or micro-docs before completing the task.\n")
        return 1

    print("\n✅ All source files and code directories are 100% covered by micro-docs.")
    return 0


if __name__ == "__main__":
    repo_root = find_repo_root()
    sys.exit(run_audit(repo_root))
