"""Unit tests for matchmaking queue behavior."""

import pytest

from services.MatchmakingService import MatchmakingService


@pytest.fixture(autouse=True)
def clean_queue_state():
    MatchmakingService._queue = []


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
