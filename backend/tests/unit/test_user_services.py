import pytest

from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException

from services.UserServices import UserServices


class DummyRow:
    def __init__(self, mapping):
        self._mapping = mapping


@pytest.mark.asyncio
async def test_row_to_dict_none():
    assert UserServices._row_to_dict(None) is None


def test_row_to_dict_dict():
    d = {"a": 1}
    assert UserServices._row_to_dict(d) is d


def test_row_to_dict_mapping():
    r = DummyRow({"uid": "u", "username": "n"})
    assert UserServices._row_to_dict(r)["uid"] == "u"


@pytest.mark.asyncio
async def test_get_user_success(monkeypatch):
    async def fake(*args, **kwargs):
        return DummyRow({"uid": "u", "username": "n", "elo_rating": 1000})

    monkeypatch.setattr("services.UserServices.fetch_one", fake)
    user = await UserServices.get_user("u")
    assert user["uid"] == "u"


@pytest.mark.asyncio
async def test_get_user_failure(monkeypatch):
    async def bad(*args, **kwargs):
        raise RuntimeError("boom")
    monkeypatch.setattr("services.UserServices.fetch_one", bad)
    with pytest.raises(HTTPException) as ei:
        await UserServices.get_user("u")
    assert ei.value.status_code == 500


@pytest.mark.asyncio
async def test_get_leaderboard_success(monkeypatch):
    captured = {}

    async def fake(query, params):
        captured["query"] = query
        captured["params"] = params
        return [
            DummyRow({"uid": "u1", "username": "alice", "elo_rating": 1600, "win_rate": 0.75, "matches": 4}),
            DummyRow({"uid": "u2", "username": "bob", "elo_rating": 1500, "win_rate": 0.5, "matches": 2}),
        ]

    monkeypatch.setattr("services.UserServices.fetch_all", fake)
    leaderboard = await UserServices.get_leaderboard(2)
    assert "u.firebase_uid AS uid" in captured["query"]
    assert "u.email" not in captured["query"]
    assert "status IN ('completed', 'aborted')" in captured["query"]
    assert captured["params"] == {"limit": 2}
    assert leaderboard[0]["uid"] == "u1"
    assert leaderboard[1]["elo_rating"] == 1500
    assert leaderboard[0]["win_rate"] == 0.75
    assert leaderboard[1]["matches"] == 2


@pytest.mark.asyncio
async def test_get_leaderboard_failure(monkeypatch):
    async def bad(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr("services.UserServices.fetch_all", bad)
    with pytest.raises(HTTPException) as ei:
        await UserServices.get_leaderboard()
    assert ei.value.status_code == 500


@pytest.mark.asyncio
async def test_create_user_duplicate_uid(monkeypatch):
    # execute raises IntegrityError with orig indicating users_pkey
    async def exec_err(*args, **kwargs):
        raise IntegrityError("dup", None, None)

    monkeypatch.setattr("services.UserServices.execute", exec_err)
    # fetch_one won't be reached, but set for completeness
    async def fake_fetch(*args, **kwargs):
        return DummyRow({"firebase_uid": "u", "username": "n", "elo_rating": 0})

    monkeypatch.setattr("services.UserServices.fetch_one", fake_fetch)
    from sqlalchemy.exc import IntegrityError as _IE

    # simulate message containing users_pkey
    # raise a proper IntegrityError with orig containing 'users_pkey'
    async def exec_err2(*args, **kwargs):
        raise _IE("dup", None, Exception("users_pkey"))

    monkeypatch.setattr("services.UserServices.execute", exec_err2)
    with pytest.raises(HTTPException) as ei:
        await UserServices.create_user(type("U", (), {"uid": "u", "username": "n"})())
    assert ei.value.status_code == 409


@pytest.mark.asyncio
async def test_create_user_created_but_not_fetchable(monkeypatch):
    async def ok_exec(*args, **kwargs):
        return None

    async def ok_fetch(*args, **kwargs):
        return None

    monkeypatch.setattr("services.UserServices.execute", ok_exec)
    monkeypatch.setattr("services.UserServices.fetch_one", ok_fetch)
    with pytest.raises(HTTPException) as ei:
        await UserServices.create_user(type("U", (), {"uid": "u2", "username": "n2"})())
    assert ei.value.status_code == 500


@pytest.mark.asyncio
async def test_get_user_from_token_invalid(monkeypatch):
    # verify_id_token raises
    def bad(*args, **kwargs):
        raise RuntimeError("bad token")

    monkeypatch.setattr("services.UserServices.auth.verify_id_token", bad)
    with pytest.raises(HTTPException) as ei:
        await UserServices.get_user_from_token("tok")
    assert ei.value.status_code == 401


@pytest.mark.asyncio
async def test_get_user_from_token_not_in_db(monkeypatch):
    monkeypatch.setattr("services.UserServices.auth.verify_id_token", lambda token, **kw: {"uid": "u3"})
    async def fake_get(uid):
        return None

    monkeypatch.setattr("services.UserServices.UserServices.get_user", staticmethod(fake_get))
    with pytest.raises(HTTPException) as ei:
        await UserServices.get_user_from_token("tok")
    assert ei.value.status_code == 404
