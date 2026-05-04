"""Integration tests for multiplayer router with service-layer mocks."""

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from services.MatchmakingService import MatchmakingResult, QueueEntry
from services.MatchmakingService import MatchmakingService
from services.MultiplayerMatchService import MultiplayerMatchService
from services.MultiplayerRealtimeService import MultiplayerRealtimeService
from services.UserServices import UserServices


@pytest.fixture(autouse=True)
def mock_multiplayer_services(monkeypatch):
    async def fake_get_user_from_token(token: str):
        if token == "valid-token":
            return {"uid": "player1-uid", "username": "player_one", "elo_rating": 1200}
        if token == "valid-token-p2":
            return {"uid": "player2-uid", "username": "player_two", "elo_rating": 1230}
        raise HTTPException(status_code=401, detail="Invalid token")

    async def fake_get_user_profile(uid: str):
        if uid == "player1-uid":
            return {
                "uid": uid,
                "username": "player_one",
                "elo_rating": 1200,
            }
        return {
            "uid": uid,
            "username": "player_two",
            "elo_rating": 1230,
        }

    async def fake_join_or_match(uid: str, username: str, elo_rating: int, game_mode: str):
        _ = (username, elo_rating)
        if uid == "player1-uid":
            return MatchmakingResult(
                status="queued",
                queue_position=1,
                elo_window=100,
                opponent=None,
            )
        return MatchmakingResult(
            status="matched",
            queue_position=None,
            elo_window=150,
            opponent=QueueEntry(
                uid="player1-uid",
                username="player_one",
                elo_rating=1200,
                game_mode=game_mode,
                joined_at=datetime.now(),
                last_seen_at=datetime.now(timezone.utc),
            ),
        )

    async def fake_leave_queue(_uid: str):
        return True

    async def fake_get_queue_status(_uid: str):
        return {
            "in_queue": True,
            "queue_position": 1,
            "waited_seconds": 4,
            "elo_window": 100,
        }

    async def fake_create_match(player1_uid: str, player2_uid: str):
        return {
            "id": 77,
            "status": "ongoing",
            "started_at": None,
            "finished_at": None,
            "winner_uid": None,
            "player1": {
                "uid": player1_uid,
                "username": "player_one",
                "elo_rating": 1200,
            },
            "player2": {
                "uid": player2_uid,
                "username": "player_two",
                "elo_rating": 1230,
            },
            "player1_score": 0,
            "player2_score": 0,
        }

    async def fake_get_match(match_id: int):
        return {
            "id": match_id,
            "status": "ongoing",
            "started_at": None,
            "finished_at": None,
            "winner_uid": None,
            "player1": {
                "uid": "player1-uid",
                "username": "player_one",
                "elo_rating": 1200,
            },
            "player2": {
                "uid": "player2-uid",
                "username": "player_two",
                "elo_rating": 1230,
            },
            "player1_score": 2,
            "player2_score": 1,
        }

    async def fake_ensure_participant(match_id: int, player_uid: str):
        if player_uid not in {"player1-uid", "player2-uid"}:
            raise HTTPException(status_code=403, detail="You are not a participant in this match")
        return await fake_get_match(match_id)

    async def fake_submit_turn(match_id: int, player_uid: str, tile_id: int, question_type: str, question_id: int, is_correct: bool):
        _ = player_uid
        return {
            "match_id": match_id,
            "tile_id": tile_id,
            "question_type": question_type,
            "question_id": question_id,
            "is_correct": is_correct,
            "player1_score": 3,
            "player2_score": 1,
        }

    async def fake_forfeit(match_id: int, _forfeited_uid: str):
        return {
            "id": match_id,
            "status": "aborted",
            "started_at": None,
            "finished_at": None,
            "winner_uid": "player2-uid",
            "player1": {
                "uid": "player1-uid",
                "username": "player_one",
                "elo_rating": 1200,
            },
            "player2": {
                "uid": "player2-uid",
                "username": "player_two",
                "elo_rating": 1230,
            },
            "player1_score": 3,
            "player2_score": 4,
        }

    async def fake_broadcast(_match_id: int, _event: str, _payload: dict):
        return None

    async def fake_send_to_player(_match_id: int, _player_uid: str, _event: str, _payload: dict):
        return None

    def fake_has_both_players_connected(_match_id: int, _player_uids: set[str]):
        return True

    def fake_get_connected_player_uids(_match_id: int):
        return {"player1-uid", "player2-uid"}

    def fake_cancel_match_start_timer(_match_id: int):
        return None

    def fake_schedule_match_start_timer(_match_id: int, _on_timeout):
        return None

    async def fake_connect(_match_id: int, _player_uid: str, websocket):
        await websocket.accept()

    def fake_disconnect(_match_id: int, _player_uid: str):
        return None

    def fake_schedule_disconnect_timer(_match_id: int, _player_uid: str, _on_timeout):
        return None

    monkeypatch.setattr(UserServices, "get_user_from_token", staticmethod(fake_get_user_from_token))
    monkeypatch.setattr(
        MultiplayerMatchService,
        "get_user_profile",
        staticmethod(fake_get_user_profile),
    )
    monkeypatch.setattr(MatchmakingService, "join_or_match", staticmethod(fake_join_or_match))
    monkeypatch.setattr(MatchmakingService, "leave_queue", staticmethod(fake_leave_queue))
    monkeypatch.setattr(MatchmakingService, "get_queue_status", staticmethod(fake_get_queue_status))
    monkeypatch.setattr(MultiplayerMatchService, "create_match", staticmethod(fake_create_match))
    monkeypatch.setattr(MultiplayerMatchService, "get_match", staticmethod(fake_get_match))
    monkeypatch.setattr(MultiplayerMatchService, "ensure_participant", staticmethod(fake_ensure_participant))
    monkeypatch.setattr(MultiplayerMatchService, "submit_turn", staticmethod(fake_submit_turn))
    monkeypatch.setattr(MultiplayerMatchService, "forfeit", staticmethod(fake_forfeit))
    monkeypatch.setattr(MultiplayerRealtimeService, "broadcast", staticmethod(fake_broadcast))
    monkeypatch.setattr(MultiplayerRealtimeService, "send_to_player", staticmethod(fake_send_to_player))
    monkeypatch.setattr(MultiplayerRealtimeService, "has_both_players_connected", staticmethod(fake_has_both_players_connected))
    monkeypatch.setattr(MultiplayerRealtimeService, "get_connected_player_uids", staticmethod(fake_get_connected_player_uids))
    monkeypatch.setattr(MultiplayerRealtimeService, "cancel_match_start_timer", staticmethod(fake_cancel_match_start_timer))
    monkeypatch.setattr(MultiplayerRealtimeService, "schedule_match_start_timer", staticmethod(fake_schedule_match_start_timer))
    monkeypatch.setattr(MultiplayerRealtimeService, "connect", staticmethod(fake_connect))
    monkeypatch.setattr(MultiplayerRealtimeService, "disconnect", staticmethod(fake_disconnect))
    monkeypatch.setattr(MultiplayerRealtimeService, "schedule_disconnect_timer", staticmethod(fake_schedule_disconnect_timer))


class TestMultiplayerQueue:
    def test_queue_join_returns_queued_when_no_match(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.post(
            "/api/multiplayer/queue/join",
            headers=headers,
            json={"game_mode": "pyramid"},
        )

        assert response.status_code == 200
        assert response.json()["status"] == "queued"
        assert response.json()["queue_position"] == 1

    def test_queue_leave_returns_removed_true(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.post("/api/multiplayer/queue/leave", headers=headers)

        assert response.status_code == 200
        assert response.json()["removed"] is True

    def test_queue_status_returns_current_status(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.get("/api/multiplayer/queue/status", headers=headers)

        assert response.status_code == 200
        assert response.json()["in_queue"] is True
        assert response.json()["queue_position"] == 1


class TestMultiplayerMatchRoutes:
    def test_get_match_returns_match_state(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.get("/api/multiplayer/matches/77", headers=headers)

        assert response.status_code == 200
        assert response.json()["id"] == 77
        assert response.json()["status"] == "ongoing"

    def test_submit_turn_returns_updated_scores(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.post(
            "/api/multiplayer/matches/77/turn",
            headers=headers,
            json={
                "tile_id": 5,
                "question_type": "standard",
                "question_id": 12,
                "is_correct": True,
            },
        )

        assert response.status_code == 200
        assert response.json()["match_id"] == 77
        assert response.json()["player1_score"] == 3

    def test_forfeit_returns_match_end_payload(self, test_client):
        headers = {"Authorization": "Bearer valid-token"}
        response = test_client.post("/api/multiplayer/matches/77/forfeit", headers=headers)

        assert response.status_code == 200
        assert response.json()["status"] == "aborted"
        assert response.json()["winner_uid"] == "player2-uid"


class TestMultiplayerWebSocket:
    def test_ws_rejects_missing_token(self, test_client):
        with pytest.raises(Exception):
            with test_client.websocket_connect("/api/multiplayer/ws/77"):
                pass

    def test_ws_accepts_valid_token(self, test_client):
        with test_client.websocket_connect("/api/multiplayer/ws/77?token=valid-token") as websocket:
            assert websocket is not None

    def test_ws_broadcasts_both_players_connected_event(self, test_client, monkeypatch):
        events: list[str] = []

        async def capture_broadcast(_match_id: int, event: str, _payload: dict):
            events.append(event)

        monkeypatch.setattr(
            MultiplayerRealtimeService,
            "broadcast",
            staticmethod(capture_broadcast),
        )

        with test_client.websocket_connect("/api/multiplayer/ws/77?token=valid-token"):
            pass

        assert "both_players_connected" in events
