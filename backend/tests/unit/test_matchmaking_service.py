"""Unit tests for matchmaking queue behavior."""

from datetime import datetime, timedelta, timezone

import pytest

from services.MatchmakingService import MatchmakingService, QueueEntry


@pytest.fixture(autouse=True)
def clean_queue_state():
    setattr(MatchmakingService, "_queue", [])
    MatchmakingService.STALE_ENTRY_SECONDS = 45


@pytest.mark.asyncio
async def test_join_or_match_queues_first_player():
    result = await MatchmakingService.join_or_match(
        uid="p1-uid",
        username="p1",
        elo_rating=1200,
        game_mode="pyramid",
    )

    assert result.status == "queued"
    assert result.queue_position == 1


@pytest.mark.asyncio
async def test_join_or_match_matches_second_player_in_elo_window():
    await MatchmakingService.join_or_match(
        uid="p1-uid",
        username="p1",
        elo_rating=1200,
        game_mode="pyramid",
    )

    result = await MatchmakingService.join_or_match(
        uid="p2-uid",
        username="p2",
        elo_rating=1260,
        game_mode="pyramid",
    )

    assert result.status == "matched"
    assert result.opponent is not None
    assert result.opponent.uid == "p1-uid"


@pytest.mark.asyncio
async def test_leave_queue_removes_player():
    await MatchmakingService.join_or_match(
        uid="p1-uid",
        username="p1",
        elo_rating=1200,
        game_mode="pyramid",
    )

    removed = await MatchmakingService.leave_queue("p1-uid")

    assert removed is True


@pytest.mark.asyncio
async def test_get_queue_status_returns_false_when_not_queued():
    status = await MatchmakingService.get_queue_status("none-uid")

    assert status["in_queue"] is False
    assert status["queue_position"] is None


@pytest.mark.asyncio
async def test_join_or_match_prunes_stale_entries_before_matching():
    now = datetime.now(timezone.utc)
    MatchmakingService.STALE_ENTRY_SECONDS = 1
    setattr(MatchmakingService, "_queue", [
        QueueEntry(
            uid="stale-uid",
            username="stale",
            elo_rating=1200,
            game_mode="pyramid",
            joined_at=now - timedelta(seconds=100),
            last_seen_at=now - timedelta(seconds=100),
        )
    ])

    result = await MatchmakingService.join_or_match(
        uid="new-uid",
        username="new",
        elo_rating=1205,
        game_mode="pyramid",
    )

    assert result.status == "queued"
    assert result.queue_position == 1
    queue = getattr(MatchmakingService, "_queue")
    assert len(queue) == 1
    assert queue[0].uid == "new-uid"


@pytest.mark.asyncio
async def test_get_queue_status_refreshes_last_seen():
    await MatchmakingService.join_or_match(
        uid="p1-uid",
        username="p1",
        elo_rating=1200,
        game_mode="pyramid",
    )
    queue = getattr(MatchmakingService, "_queue")
    queued_entry = queue[0]
    queued_entry.last_seen_at = queued_entry.last_seen_at - timedelta(seconds=10)
    before = queued_entry.last_seen_at

    status = await MatchmakingService.get_queue_status("p1-uid")

    assert status["in_queue"] is True
    assert queue[0].last_seen_at > before
