import pytest
import asyncio

from services.MultiplayerMatchService import MultiplayerMatchService
from fastapi import HTTPException


@pytest.mark.asyncio
async def test_create_match_same_player_raises():
    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.create_match("u1", "u1")
    assert ei.value.status_code == 400


@pytest.mark.asyncio
async def test_ensure_participant_not_participant():
    # prepare a match dict
    match = {"player1": {"uid": "u1"}, "player2": {"uid": "u2"}}

    async def fake_get_match(mid):
        return match

    from services.MultiplayerMatchService import MultiplayerMatchService as M
    M.get_match = staticmethod(fake_get_match)

    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.ensure_participant(1, "other")
    assert ei.value.status_code == 403


@pytest.mark.asyncio
async def test_get_active_match_for_player_none(monkeypatch):
    async def fake_fetch_one(query, params=None):
        return None

    monkeypatch.setattr("services.MultiplayerMatchService.fetch_one", fake_fetch_one)
    res = await MultiplayerMatchService.get_active_match_for_player("u3")
    assert res is None


@pytest.mark.asyncio
async def test_finalize_match_invalid_winner_raises(monkeypatch):
    # get_match returns a match where participants are u1/u2
    async def fake_get_match(mid):
        return {"player1": {"uid": "u1"}, "player2": {"uid": "u2"}, "status": "ongoing", "player1_score": 0, "player2_score": 0}

    monkeypatch.setattr(MultiplayerMatchService, "get_match", staticmethod(fake_get_match))
    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.finalize_match(10, "not_a_participant")
    assert ei.value.status_code == 400


@pytest.mark.asyncio
async def test_forfeit_when_finished_raises(monkeypatch):
    async def fake_ensure(mid, uid):
        return {"status": "completed", "player1": {"uid": "u1"}, "player2": {"uid": "u2"}}

    monkeypatch.setattr(MultiplayerMatchService, "ensure_participant", staticmethod(fake_ensure))
    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.forfeit(1, "u1")
    assert ei.value.status_code == 409
