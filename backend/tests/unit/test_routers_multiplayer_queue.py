import pytest
from fastapi import HTTPException

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
        return FakeResult(status="queued", queue_position=2, elo_window=100)

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.join_or_match", fake_join_or_match)

    from routers.multiplayer import queue_join

    # call with payload-like object
    class Payload:
        game_mode = "standard"

    async def coro():
        resp = await queue_join(Payload(), user={"uid": "u", "username": "n", "elo_rating": 1000})
        return resp

    import asyncio
    resp = asyncio.get_event_loop().run_until_complete(coro())
    assert resp.status == "queued"


def test_queue_join_matched_no_opponent(monkeypatch):
    async def fake_join(uid, username, elo_rating, game_mode):
        return FakeResult(status="matched", opponent=None, elo_window=50)

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.join_or_match", fake_join)

    class Payload:
        game_mode = "standard"

    import asyncio

    async def coro():
        await multiplayer.queue_join(Payload(), user={"uid": "u", "username": "n", "elo_rating": 1000})

    with pytest.raises(HTTPException):
        asyncio.get_event_loop().run_until_complete(coro())


def test_queue_leave_calls_leave_queue(monkeypatch):
    async def fake_leave(uid):
        return True

    monkeypatch.setattr("services.MatchmakingService.MatchmakingService.leave_queue", fake_leave)

    import asyncio

    async def coro():
        return await multiplayer.queue_leave(user={"uid": "u"})

    res = asyncio.get_event_loop().run_until_complete(coro())
    assert res == {"removed": True}
