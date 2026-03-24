
import os
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://quizapp:quizapp_pass@postgres:5432/quizapp",
)

pool = None


def _normalize_params(args: tuple):
    if not args:
        return {}
    if len(args) == 1 and isinstance(args[0], dict):
        return args[0]
    raise ValueError("Query parameters must be passed as a single dictionary argument.")


async def init_db():
    global pool
    if pool is not None:
        return

    pool = create_async_engine(DATABASE_URL, echo=False)

    # Test connectivity
    async with pool.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def close_db():
    global pool
    if pool is not None:
        await pool.dispose()
        pool = None


@asynccontextmanager
async def get_connection():
    if pool is None:
        await init_db()

    async with pool.connect() as conn:
        yield conn


async def execute(query: str, *args):
    params = _normalize_params(args)
    if pool is None:
        await init_db()

    async with pool.begin() as conn:
        return await conn.execute(text(query), params)


async def fetch_one(query: str, *args):
    params = _normalize_params(args)
    async with get_connection() as conn:
        result = await conn.execute(text(query), params)
        return result.fetchone()


async def fetch_all(query: str, *args):
    params = _normalize_params(args)
    async with get_connection() as conn:
        result = await conn.execute(text(query), params)
        return result.fetchall()
