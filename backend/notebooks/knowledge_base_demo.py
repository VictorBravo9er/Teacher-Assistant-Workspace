"""Didactiq Knowledge Base in Action — Runnable CLI & # %% Interactive Demonstration.

Usage (from backend/):
  uv run python notebooks/knowledge_base_demo.py
  uv run python notebooks/knowledge_base_demo.py --mode in_memory_real_llm
  uv run python notebooks/knowledge_base_demo.py --mode live
  uv run python notebooks/knowledge_base_demo.py --mode live --base-url http://localhost:8090
"""

# %% [1] Setup & Imports
from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
import sys

_BASE_DIR = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
_BACKEND_DIR = next(
    (p for p in (_BASE_DIR, *_BASE_DIR.parents, _BASE_DIR / "backend") if (p / "src" / "main.py").exists()),
    _BASE_DIR.parent,
)
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from notebooks._common import resolve_demo_mode, run_full_knowledge_base_demo


# %% [2] Run Complete 7-Act Classroom Knowledge Base Demo
def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Didactiq Knowledge Base in Action Demo")
    _ = parser.add_argument(
        "--mode",
        choices=("in_memory", "in_memory_real_llm", "live"),
        default=None,
        help="Execution mode (defaults to DEMO_MODE env var or 'in_memory').",
    )
    _ = parser.add_argument(
        "--base-url",
        default=None,
        help="Optional running FastAPI server URL (e.g., http://localhost:8090) in live mode.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    selected_mode = resolve_demo_mode(args.mode)
    _ = asyncio.run(run_full_knowledge_base_demo(mode=selected_mode, base_url=args.base_url))
elif "__file__" not in globals():
    # Interactive # %% cell execution in IPython/Jupyter
    _ = asyncio.run(run_full_knowledge_base_demo(mode=resolve_demo_mode()))
