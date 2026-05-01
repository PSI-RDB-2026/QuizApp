import pytest

from routers.Users import register_user, get_user_info, login_user
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_register_user_success(monkeypatch):
    # mock create_user to return created user
    async def fake_create(user):
        return {"uid": user.uid, "username": user.username, "elo_rating": 0}

    monkeypatch.setattr("services.UserServices.UserServices.create_user", staticmethod(fake_create))
    resp = await register_user("jim", uid="u1")
    # register_user returns Response with status_code 201
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_get_user_info_not_found(monkeypatch):
    async def fake_get(uid):
        return None

    monkeypatch.setattr("services.UserServices.UserServices.get_user", staticmethod(fake_get))
    with pytest.raises(HTTPException) as ei:
        await get_user_info(uid="u1")
    assert ei.value.status_code == 404


@pytest.mark.asyncio
async def test_get_user_info_ok(monkeypatch):
    async def fake_get_ok(uid):
        return {"uid": uid, "username": "bob", "elo_rating": 1500}

    monkeypatch.setattr("services.UserServices.UserServices.get_user", staticmethod(fake_get_ok))
    resp = await get_user_info(uid="u2")
    assert resp.status_code == 200
    assert resp.body is not None


@pytest.mark.asyncio
async def test_login_user_new(monkeypatch):
    # user not present -> create_user called
    async def fake_get_none(uid):
        return None

    async def fake_create2(u):
        return {"uid": u.uid, "username": u.username}

    monkeypatch.setattr("services.UserServices.UserServices.get_user", staticmethod(fake_get_none))
    monkeypatch.setattr("services.UserServices.UserServices.create_user", staticmethod(fake_create2))
    resp = await login_user("nick", uid="u3")
    assert resp.status_code == 200
