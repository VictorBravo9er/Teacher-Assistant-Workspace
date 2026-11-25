from __future__ import annotations

from collections.abc import AsyncGenerator, Mapping, Sequence
from contextlib import asynccontextmanager
import os
from typing import Any, cast
from typing_extensions import LiteralString

from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from src.lib.logger import db_logger

# Ensure environment is loaded
_ = load_dotenv()

_pool: AsyncConnectionPool | None = None


def get_postgres_uri() -> str:
    """Retrieve the PostgreSQL connection URI from environment variables."""
    uri = os.environ.get("POSTGRES_URI")
    if not uri:
        db_logger.error("POSTGRES_URI environment variable is missing or empty")
        raise ValueError("POSTGRES_URI environment variable is not set.")
    return uri


async def init_db_pool() -> AsyncConnectionPool:
    """Initialize and open the asynchronous database connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        uri = get_postgres_uri()
        db_logger.info("Initializing PostgreSQL AsyncConnectionPool")
        _pool = AsyncConnectionPool(
            conninfo=uri,
            min_size=1,
            max_size=5,
            timeout=15.0,
            open=False,
            kwargs={
                "autocommit": True,
                "row_factory": dict_row,
            },
        )
        await _pool.open()
    return _pool


async def get_db_pool() -> AsyncConnectionPool:
    """Get the active pool or initialize it if necessary."""
    global _pool
    if _pool is None or _pool.closed:
        return await init_db_pool()
    return _pool


async def close_db_pool() -> None:
    """Close the global database pool if open."""
    global _pool
    if _pool is not None and not _pool.closed:
        db_logger.info("Closing PostgreSQL AsyncConnectionPool")
        await _pool.close()
        _pool = None


@asynccontextmanager
async def get_connection() -> (
    AsyncGenerator[psycopg.AsyncConnection[dict[str, Any]], None]
):
    """Async context manager to acquire a connection from the pool."""
    pool = await get_db_pool()
    async with pool.connection() as conn:
        yield cast(psycopg.AsyncConnection[dict[str, Any]], conn)


async def fetch_all(
    sql: str, params: Sequence[object] | Mapping[str, object] | None = None
) -> list[dict[str, Any]]:
    """Execute a query and return all rows as dictionaries."""
    pool = await get_db_pool()
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            _ = await cur.execute(cast(LiteralString, sql), params)
            rows = await cur.fetchall()
            return [dict(r) for r in rows]


async def fetch_one(
    sql: str, params: Sequence[object] | Mapping[str, object] | None = None
) -> dict[str, Any] | None:
    """Execute a query and return a single row or None."""
    pool = await get_db_pool()
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            _ = await cur.execute(cast(LiteralString, sql), params)
            row = await cur.fetchone()
            return dict(row) if row is not None else None


async def execute(
    sql: str, params: Sequence[object] | Mapping[str, object] | None = None
) -> int:
    """Execute an insert, update, or delete statement and return affected row count."""
    pool = await get_db_pool()
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            _ = await cur.execute(cast(LiteralString, sql), params)
            return cur.rowcount
