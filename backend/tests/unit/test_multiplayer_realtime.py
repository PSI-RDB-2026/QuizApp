import asyncio
import pytest

from services.MultiplayerRealtimeService import MultiplayerRealtimeService


class FakeWebSocket:
    def __init__(self):
        self.sent = []
        self.accepted = False

    async def accept(self):
        self.accepted = True

    async def send_text(self, text):
        self.sent.append(("text", text))

    async def send_json(self, obj):
        self.sent.append(("json", obj))

    async def receive_text(self):
        await asyncio.sleep(0)
        return "{}"


@pytest.fixture(autouse=True)
def reset_realtime_state():
    setattr(MultiplayerRealtimeService, "_connections", {})
    setattr(MultiplayerRealtimeService, "_disconnect_tasks", {})
    setattr(MultiplayerRealtimeService, "_match_start_tasks", {})
    setattr(MultiplayerRealtimeService, "_snapshots", {})
    yield
    setattr(MultiplayerRealtimeService, "_connections", {})
    setattr(MultiplayerRealtimeService, "_disconnect_tasks", {})
    setattr(MultiplayerRealtimeService, "_match_start_tasks", {})
    setattr(MultiplayerRealtimeService, "_snapshots", {})


@pytest.mark.asyncio
async def test_connect_and_disconnect():
    ws = FakeWebSocket()
    await MultiplayerRealtimeService.connect(1, "p1", ws)
    assert getattr(MultiplayerRealtimeService, "_connections")[1]["p1"] is ws
    assert MultiplayerRealtimeService.get_connected_player_uids(1) == {"p1"}
    MultiplayerRealtimeService.disconnect(1, "p1")
    assert 1 not in getattr(MultiplayerRealtimeService, "_connections")


@pytest.mark.asyncio
async def test_broadcast_and_send_to_player():
    ws1 = FakeWebSocket()
    ws2 = FakeWebSocket()
    await MultiplayerRealtimeService.connect(2, "a", ws1)
    await MultiplayerRealtimeService.connect(2, "b", ws2)

    # make ws1 raise on send_text to simulate disconnect
    async def bad_send(text):
        raise RuntimeError("gone")

    ws1.send_text = bad_send

    await MultiplayerRealtimeService.broadcast(2, "ev", {"x": 1})
    # ws1 should be removed, ws2 should have received
    assert "a" not in getattr(MultiplayerRealtimeService, "_connections").get(2, {})
    assert any(s for (t, s) in ws2.sent if t == "text")

    # send_to_player for non-existing player does nothing
    await MultiplayerRealtimeService.send_to_player(2, "nope", "ev", {"y": 2})

    # send_to_player to existing
    await MultiplayerRealtimeService.send_to_player(2, "b", "ev2", {"y": 3})
    assert any(t == "json" and obj["event"] == "ev2" for (t, obj) in ws2.sent)


@pytest.mark.asyncio
async def test_disconnect_timer():
    called = {}

    async def on_timeout(match_id, uid):
        called["ok"] = (match_id, uid)

    previous_value = MultiplayerRealtimeService.DISCONNECT_GRACE_SECONDS
    try:
        MultiplayerRealtimeService.DISCONNECT_GRACE_SECONDS = 0
        MultiplayerRealtimeService.schedule_disconnect_timer(3, "z", on_timeout)
        await asyncio.sleep(0.01)
        assert called.get("ok") == (3, "z")
    finally:
        MultiplayerRealtimeService.DISCONNECT_GRACE_SECONDS = previous_value


@pytest.mark.asyncio
async def test_match_ready_helpers():
    ws1 = FakeWebSocket()
    ws2 = FakeWebSocket()
    await MultiplayerRealtimeService.connect(4, "p1", ws1)
    assert MultiplayerRealtimeService.has_both_players_connected(4, {"p1", "p2"}) is False

    await MultiplayerRealtimeService.connect(4, "p2", ws2)
    assert MultiplayerRealtimeService.has_both_players_connected(4, {"p1", "p2"}) is True


@pytest.mark.asyncio
async def test_match_start_timer():
    called = {}

    async def on_timeout(match_id):
        called["ok"] = match_id

    previous_value = MultiplayerRealtimeService.MATCH_START_GRACE_SECONDS
    try:
        MultiplayerRealtimeService.MATCH_START_GRACE_SECONDS = 0
        MultiplayerRealtimeService.schedule_match_start_timer(8, on_timeout)
        await asyncio.sleep(0.01)

        assert called.get("ok") == 8
    finally:
        MultiplayerRealtimeService.MATCH_START_GRACE_SECONDS = previous_value
