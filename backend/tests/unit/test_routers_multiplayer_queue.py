from datetime import datetime, timezone
import asyncio

import pytest
from fastapi import HTTPException
from services.MatchmakingService import QueueEntry

from routers import multiplayer


class FakeResult:
    def __init__(self, status, queue_position=None, elo_window=None, opponent=None):
        self.status = status
        self.queue_position = queue_position
        self.elo_window = elo_window
        self.opponent = opponent


def test_queue_join_queued(monkeypatch):
    # join_or_match returns queued
    async def fake_join_or_match(uid, username, elo_rating, game_mode):
        _ = (uid, username, elo_rating, game_mode)
        return FakeResult(status="queued", queue_position=2, elo_window=100)

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.join_or_match", fake_join_or_match)

    from routers.multiplayer import queue_join

    # call with payload-like object
    class Payload:
        game_mode = "standard"

    async def coro():
        resp = await queue_join(Payload(), user={"uid": "u", "username": "n", "elo_rating": 1000})
        return resp

    resp = asyncio.run(coro())
    assert resp.status == "queued"


def test_queue_join_matched_no_opponent(monkeypatch):
    async def fake_join(uid, username, elo_rating, game_mode):
        _ = (uid, username, elo_rating, game_mode)
        return FakeResult(status="matched", opponent=None, elo_window=50)

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.join_or_match", fake_join)

    class Payload:
        game_mode = "standard"

    async def coro():
        await multiplayer.queue_join(Payload(), user={"uid": "u", "username": "n", "elo_rating": 1000})

    with pytest.raises(HTTPException):
        asyncio.run(coro())


def test_queue_leave_calls_leave_queue(monkeypatch):
    async def fake_leave(uid):
        _ = uid
        return True

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.leave_queue", fake_leave)

    async def coro():
        return await multiplayer.queue_leave(user={"uid": "u"})

    res = asyncio.run(coro())
    assert res == {"removed": True}


def test_queue_join_requeues_opponent_when_match_creation_fails(monkeypatch):
    now = datetime.now(timezone.utc)
    opponent = QueueEntry(
        uid="opponent-uid",
        username="opponent",
        elo_rating=1200,
        game_mode="standard",
        joined_at=now,
        last_seen_at=now,
    )

    async def fake_join(uid, username, elo_rating, game_mode):
        _ = (uid, username, elo_rating, game_mode)
        return FakeResult(status="matched", opponent=opponent, elo_window=50)

    async def fake_create_match(player1_uid, player2_uid):
        _ = (player1_uid, player2_uid)
        raise HTTPException(status_code=500, detail="create failed")

    called = {"uid": None}

    async def fake_requeue_entry(entry):
        called["uid"] = entry.uid

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.join_or_match", fake_join)
    monkeypatch.setattr("services.MultiplayerMatchService.MultiplayerMatchService.create_match", fake_create_match)
    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.requeue_entry", fake_requeue_entry)

    class Payload:
        game_mode = "standard"

    async def coro():
        await multiplayer.queue_join(Payload(), user={"uid": "u", "username": "n", "elo_rating": 1000})

    with pytest.raises(HTTPException):
        asyncio.run(coro())

    assert called["uid"] == "opponent-uid"
