"""Pytest configuration for Didactiq backend test suites."""

from __future__ import annotations

import os
from pathlib import Path
import sys

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def pytest_addoption(parser: pytest.Parser) -> None:
    """Register optional --live flag to run live OpenRouter / PostgreSQL checks."""
    parser.addoption(
        "--live",
        action="store_true",
        default=False,
        help="Run live integration tests against configured PostgreSQL and OpenRouter API.",
    )


def pytest_configure(config: pytest.Config) -> None:
    """Propagate --live CLI flag to DIDACTIQ_TEST_MODE when requested."""
    if config.getoption("--live"):
        os.environ["DIDACTIQ_TEST_MODE"] = "live"
