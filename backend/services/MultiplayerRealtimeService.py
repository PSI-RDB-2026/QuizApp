import asyncio
import json
import os

from fastapi import WebSocket


class MultiplayerRealtimeService:
    _connections: dict[int, dict[str, WebSocket]] = {}
    _disconnect_tasks: dict[tuple[int, str], asyncio.Task] = {}
    _snapshots: dict[int, dict] = {}

    DISCONNECT_GRACE_SECONDS = int(
        os.getenv("MULTIPLAYER_DISCONNECT_GRACE_SECONDS", "30")
    )

    @staticmethod
    async def connect(match_id: int, player_email: str, websocket: WebSocket):
        await websocket.accept()
        room = MultiplayerRealtimeService._connections.setdefault(match_id, {})
        room[player_email] = websocket
        MultiplayerRealtimeService.cancel_disconnect_timer(match_id, player_email)

    @staticmethod
    def disconnect(match_id: int, player_email: str):
        room = MultiplayerRealtimeService._connections.get(match_id, {})
        room.pop(player_email, None)
        if not room and match_id in MultiplayerRealtimeService._connections:
            MultiplayerRealtimeService._connections.pop(match_id, None)

    @staticmethod
    async def broadcast(match_id: int, event: str, payload: dict):
        room = MultiplayerRealtimeService._connections.get(match_id, {})
        if not room:
            return

        message = json.dumps({"event": event, "payload": payload})
        disconnected_players = []
        for player_email, websocket in room.items():
            try:
                await websocket.send_text(message)
            except Exception:
                disconnected_players.append(player_email)

        for player_email in disconnected_players:
            MultiplayerRealtimeService.disconnect(match_id, player_email)

    @staticmethod
    async def send_to_player(
        match_id: int, player_email: str, event: str, payload: dict
    ):
        room = MultiplayerRealtimeService._connections.get(match_id, {})
        websocket = room.get(player_email)
        if not websocket:
            return
        await websocket.send_json({"event": event, "payload": payload})

    @staticmethod
    def set_snapshot(match_id: int, snapshot: dict):
        MultiplayerRealtimeService._snapshots[match_id] = snapshot

    @staticmethod
    def get_snapshot(match_id: int) -> dict | None:
        return MultiplayerRealtimeService._snapshots.get(match_id)

    @staticmethod
    def clear_snapshot(match_id: int):
        MultiplayerRealtimeService._snapshots.pop(match_id, None)

    @staticmethod
    def cancel_disconnect_timer(match_id: int, player_email: str):
        key = (match_id, player_email)
        task = MultiplayerRealtimeService._disconnect_tasks.pop(key, None)
        if task:
            task.cancel()

    @staticmethod
    def schedule_disconnect_timer(match_id: int, player_email: str, on_timeout):
        async def timer_task():
            try:
                await asyncio.sleep(MultiplayerRealtimeService.DISCONNECT_GRACE_SECONDS)
                await on_timeout(match_id, player_email)
            finally:
                MultiplayerRealtimeService._disconnect_tasks.pop(
                    (match_id, player_email), None
                )

        key = (match_id, player_email)
        MultiplayerRealtimeService.cancel_disconnect_timer(match_id, player_email)
        MultiplayerRealtimeService._disconnect_tasks[key] = asyncio.create_task(
            timer_task()
        )
