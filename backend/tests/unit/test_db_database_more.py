import pytest
import asyncio
from sqlalchemy.exc import IntegrityError

from db import database


class FakeResult:
    def __init__(self, one=None, all_=None):
        self._one = one
        self._all = all_

    def fetchone(self):
        return self._one

    def fetchall(self):
        return self._all


class FakeConn:
    def __init__(self, result=None, raise_exc=None):
        self._result = result or FakeResult()
        self._raise = raise_exc

    async def execute(self, query, params=None):
        if self._raise:
            raise self._raise
        return self._result


class AsyncCM:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakePool:
    def __init__(self, conn):
        self._conn = conn

    def connect(self):
        return AsyncCM(self._conn)

    def begin(self):
        return AsyncCM(self._conn)

    async def dispose(self):
        pass


def test_execute_and_fetch_one_fetch_all(monkeypatch):
    # prepare fake result
    one = object()
    all_ = [1, 2, 3]
    fake = FakeResult(one=one, all_=all_)
    conn = FakeConn(result=fake)
    pool = FakePool(conn)

    monkeypatch.setattr(database, "POOL", pool)

    # execute should return result
    res = asyncio.get_event_loop().run_until_complete(database.execute("select 1"))
    assert res.fetchone() is one

    r1 = asyncio.get_event_loop().run_until_complete(database.fetch_one("select 1"))
    assert r1 is one

    r2 = asyncio.get_event_loop().run_until_complete(database.fetch_all("select *"))
    assert r2 == all_


def test_execute_integrity_error(monkeypatch):
    conn = FakeConn(raise_exc=IntegrityError("dup", None, None))
    pool = FakePool(conn)
    monkeypatch.setattr(database, "POOL", pool)

    with pytest.raises(IntegrityError):
        asyncio.get_event_loop().run_until_complete(database.execute("insert"))
