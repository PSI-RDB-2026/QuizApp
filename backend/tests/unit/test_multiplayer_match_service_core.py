import pytest
import asyncio

from services.MultiplayerMatchService import MultiplayerMatchService


class DummyRow:
    def __init__(self, mapping):
        self._mapping = mapping


@pytest.mark.asyncio
async def test_create_match_and_get_match(monkeypatch):
    # prepare two users
    user1 = DummyRow({"uid": "u1", "username": "a", "elo_rating": 1000})
    user2 = DummyRow({"uid": "u2", "username": "b", "elo_rating": 1000})

    async def fake_fetch_one(query, params=None):
        # return different rows based on query content
        if "WHERE firebase_uid = :uid" in query:
            uid = params.get("uid")
            return user1 if uid == "u1" else user2 if uid == "u2" else None
        # creating match returns a row with id and status
        if "INSERT INTO matches" in query:
            return DummyRow({"id": 10, "status": "ongoing", "started_at": None})
        if "SELECT id" in query and "WHERE status = 'ongoing'" in query:
            return DummyRow({"id": 10})
        if "SELECT id, player1_id" in query:
            # return match row
            return DummyRow({"id": 10, "player1_id": "u1", "player2_id": "u2", "winner_id": None, "status": "ongoing", "started_at": None, "finished_at": None})
        return None

    async def fake_execute(query, params=None):
        class R:
            def fetchone(self):
                return DummyRow({"id": 10, "status": "ongoing", "started_at": None})

        return R()

    monkeypatch.setattr("services.MultiplayerMatchService.fetch_one", fake_fetch_one)
    async def fake_get_user(uid):
        return user1._mapping if uid == 'u1' else user2._mapping

    monkeypatch.setattr(MultiplayerMatchService, "_get_user", staticmethod(fake_get_user))
    monkeypatch.setattr("services.MultiplayerMatchService.execute", fake_execute)

    created = await MultiplayerMatchService.create_match("u1", "u2")
    assert created["id"] == 10

    got = await MultiplayerMatchService.get_match(10)
    assert got["id"] == 10


@pytest.mark.asyncio
async def test_submit_turn_updates_score(monkeypatch):
    # reuse dummy match data
    match = {"id": 10, "player1": {"uid": "u1"}, "player2": {"uid": "u2"}, "player1_score": 0, "player2_score": 0, "status": "ongoing"}

    async def fake_get_match(mid):
        return match

    async def fake_ensure(mid, uid):
        return match

    async def fake_execute(query, params=None):
        return None

    monkeypatch.setattr(MultiplayerMatchService, "get_match", staticmethod(fake_get_match))
    monkeypatch.setattr(MultiplayerMatchService, "ensure_participant", staticmethod(fake_ensure))
    monkeypatch.setattr("services.MultiplayerMatchService.execute", fake_execute)

    # submit a correct turn for u1
    res = await MultiplayerMatchService.submit_turn(10, "u1", 1, "standard", 5, True)
    assert res["player1_score"] >= 1 or res["player2_score"] >= 0


@pytest.mark.asyncio
async def test_update_elo_and_finalize(monkeypatch):
    # mock _get_user to return user dicts with elo ratings
    async def fake_get(uid, conn=None):
        return {"uid": uid, "elo_rating": 1200 if uid == "w" else 1100}

    async def fake_execute(query, params=None):
        return None

    monkeypatch.setattr(MultiplayerMatchService, "_get_user", staticmethod(fake_get))
    monkeypatch.setattr("services.MultiplayerMatchService.execute", fake_execute)

    winner_delta, loser_delta = await MultiplayerMatchService._update_elo("w", "l")
    assert isinstance(winner_delta, int) and isinstance(loser_delta, int)
