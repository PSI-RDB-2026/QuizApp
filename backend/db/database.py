"""This module provides asynchronous database connection management
and query execution
"""

import logging
import os
import time
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://quizapp:quizapp_pass@postgres:5432/quizapp",
)

POOL = None
logger = logging.getLogger(__name__)


def _normalize_params(args: tuple):
    if not args:
        return {}
    if len(args) == 1 and isinstance(args[0], dict):
        return args[0]
    raise ValueError("Query parameters must be passed as a single dictionary argument.")


async def init_db():
    """Initializes the database connection pool"""
    global POOL
    if POOL is not None:
        return

    POOL = create_async_engine(DATABASE_URL, echo=False)

    # Test connectivity
    started_at = time.perf_counter()
    try:
        async with POOL.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info(
            "database_initialized",
            extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2)},
        )
    except Exception:
        logger.exception("database_initialization_failed")
        raise


async def close_db():
    """Closes the database connection pool"""
    global POOL
    if POOL is not None:
        await POOL.dispose()
        POOL = None


@asynccontextmanager
async def get_connection():
    """Provides an asynchronous context manager for database connections"""
    if POOL is None:
        await init_db()

    async with POOL.connect() as conn:
        yield conn


async def execute(query: str, *args):
    """Executes a query with the provided parameters"""
    params = _normalize_params(args)
    if POOL is None:
        await init_db()

    started_at = time.perf_counter()
    try:
        async with POOL.begin() as conn:
            result = await conn.execute(text(query), params)
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        if duration_ms >= 200:
            logger.warning(
                "slow_database_query",
                extra={"duration_ms": duration_ms, "query": query[:200]},
            )
        else:
            logger.debug(
                "database_query_executed",
                extra={"duration_ms": duration_ms, "query": query[:200]},
            )
        return result
    except Exception:
        logger.exception("database_query_failed", extra={"query": query[:200]})
        raise


async def fetch_one(query: str, *args):
    """Fetches a single row from the database"""
    params = _normalize_params(args)
    started_at = time.perf_counter()
    try:
        async with get_connection() as conn:
            result = await conn.execute(text(query), params)
            row = result.fetchone()
        logger.debug(
            "database_fetch_one_executed",
            extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2), "query": query[:200]},
        )
        return row
    except Exception:
        logger.exception("database_fetch_one_failed", extra={"query": query[:200]})
        raise


async def fetch_all(query: str, *args):
    """Fetches all rows from the database"""
    params = _normalize_params(args)
    started_at = time.perf_counter()
    try:
        async with get_connection() as conn:
            result = await conn.execute(text(query), params)
            rows = result.fetchall()
        logger.debug(
            "database_fetch_all_executed",
            extra={"duration_ms": round((time.perf_counter() - started_at) * 1000, 2), "query": query[:200]},
        )
        return rows
    except Exception:
        logger.exception("database_fetch_all_failed", extra={"query": query[:200]})
        raise
