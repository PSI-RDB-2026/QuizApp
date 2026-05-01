import pytest

from routers.health import is_db_available, db_health_check


@pytest.mark.asyncio
async def test_is_db_available_true(monkeypatch):
    async def ok(*args, **kwargs):
        return None

    monkeypatch.setattr("routers.health.execute", ok)
    assert await is_db_available() is True


@pytest.mark.asyncio
async def test_is_db_available_false(monkeypatch):
    async def bad(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("routers.health.execute", bad)
    assert await is_db_available() is False


@pytest.mark.asyncio
async def test_db_health_check_raises(monkeypatch):
    async def bad(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("routers.health.execute", bad)
    with pytest.raises(Exception):
        await db_health_check()
