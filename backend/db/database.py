'''This module provides asynchronous database connection management
and query execution
'''
import os
from contextlib import asynccontextmanager
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://quizapp:quizapp_pass@postgres:5432/quizapp",
)

POOL = None


def _normalize_params(args: tuple):
    if not args:
        return {}
    if len(args) == 1 and isinstance(args[0], dict):
        return args[0]
    raise ValueError(
        "Query parameters must be passed as a single dictionary argument.")


async def init_db():
    '''Initializes the database connection pool'''
    global POOL
    if POOL is not None:
        return

    POOL = create_async_engine(DATABASE_URL, echo=False)

    # Test connectivity
    async with POOL.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def close_db():
    '''Closes the database connection pool'''
    global POOL
    if POOL is not None:
        await POOL.dispose()
        POOL = None


@asynccontextmanager
async def get_connection():
    '''Provides an asynchronous context manager for database connections'''
    if POOL is None:
        await init_db()

    async with POOL.connect() as conn:
        yield conn


async def execute(query: str, *args):
    '''Executes a query with the provided parameters'''
    params = _normalize_params(args)
    if POOL is None:
        await init_db()

    async with POOL.begin() as conn:
        return await conn.execute(text(query), params)


async def fetch_one(query: str, *args):
    '''Fetches a single row from the database'''
    params = _normalize_params(args)
    async with get_connection() as conn:
        result = await conn.execute(text(query), params)
        return result.fetchone()


async def fetch_all(query: str, *args):
    '''Fetches all rows from the database'''
    params = _normalize_params(args)
    async with get_connection() as conn:
        result = await conn.execute(text(query), params)
        return result.fetchall()
