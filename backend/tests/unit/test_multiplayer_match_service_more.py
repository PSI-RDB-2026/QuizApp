import pytest
import asyncio
from contextlib import asynccontextmanager

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
        return {
            "player1": {"uid": "u1"},
            "player2": {"uid": "u2"},
            "status": "ongoing",
            "player1_score": 0,
            "player2_score": 0,
        }

    monkeypatch.setattr(
        MultiplayerMatchService, "get_match", staticmethod(fake_get_match)
    )
    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.finalize_match(10, "not_a_participant")
    assert ei.value.status_code == 400


@pytest.mark.asyncio
async def test_finalize_match_keeps_connections_for_broadcast(monkeypatch):
    calls = {"clear_snapshot": 0, "disconnect": 0}

    async def fake_get_match(mid):
        return {
            "player1": {"uid": "u1"},
            "player2": {"uid": "u2"},
            "status": "ongoing",
            "player1_score": 0,
            "player2_score": 0,
        }

    async def fake_update_elo(winner_uid, loser_uid, conn=None):
        return 12, -12

    async def fake_execute(query, params=None):
        class FakeResult:
            def fetchone(self):
                return None

        return FakeResult()

    def fake_clear_snapshot(match_id):
        calls["clear_snapshot"] += 1

    def fake_disconnect(match_id, player_uid):
        calls["disconnect"] += 1

    @asynccontextmanager
    async def fake_transaction():
        class FakeConn:
            async def execute(self, query, params=None):
                return await fake_execute(query, params)

        yield FakeConn()

    monkeypatch.setattr(
        MultiplayerMatchService, "get_match", staticmethod(fake_get_match)
    )
    monkeypatch.setattr(
        MultiplayerMatchService, "_update_elo", staticmethod(fake_update_elo)
    )
    monkeypatch.setattr("services.MultiplayerMatchService.execute", fake_execute)
    monkeypatch.setattr("services.MultiplayerMatchService.transaction", fake_transaction)
    monkeypatch.setattr(
        "services.MultiplayerRealtimeService.MultiplayerRealtimeService.clear_snapshot",
        staticmethod(fake_clear_snapshot),
    )
    monkeypatch.setattr(
        "services.MultiplayerRealtimeService.MultiplayerRealtimeService.disconnect",
        staticmethod(fake_disconnect),
    )

    result = await MultiplayerMatchService.finalize_match(10, "u1")

    assert result["status"] == "ongoing"
    assert calls["clear_snapshot"] == 0
    assert calls["disconnect"] == 0


@pytest.mark.asyncio
async def test_forfeit_when_finished_raises(monkeypatch):
    async def fake_ensure(mid, uid):
        return {
            "status": "completed",
            "player1": {"uid": "u1"},
            "player2": {"uid": "u2"},
        }

    monkeypatch.setattr(
        MultiplayerMatchService, "ensure_participant", staticmethod(fake_ensure)
    )
    with pytest.raises(HTTPException) as ei:
        await MultiplayerMatchService.forfeit(1, "u1")
    assert ei.value.status_code == 409
