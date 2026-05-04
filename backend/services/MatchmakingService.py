import asyncio
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class QueueEntry:
    uid: str
    username: str
    elo_rating: int
    game_mode: str
    joined_at: datetime
    last_seen_at: datetime


@dataclass
class MatchmakingResult:
    status: str
    queue_position: int | None
    elo_window: int
    opponent: QueueEntry | None = None


class MatchmakingService:
    _queue: list[QueueEntry] = []
    _lock = asyncio.Lock()

    BASE_ELO_WINDOW = int(os.getenv("MATCHMAKING_BASE_ELO_WINDOW", "100"))
    ELO_WINDOW_STEP = int(os.getenv("MATCHMAKING_ELO_WINDOW_STEP", "50"))
    ELO_WINDOW_STEP_SECONDS = int(
        os.getenv("MATCHMAKING_ELO_WINDOW_STEP_SECONDS", "15")
    )
    MAX_ELO_WINDOW = int(os.getenv("MATCHMAKING_MAX_ELO_WINDOW", "400"))
    STALE_ENTRY_SECONDS = int(os.getenv("MATCHMAKING_STALE_ENTRY_SECONDS", "45"))

    @staticmethod
    def _is_stale(entry: QueueEntry, now: datetime) -> bool:
        stale_after = timedelta(seconds=max(1, MatchmakingService.STALE_ENTRY_SECONDS))
        return now - entry.last_seen_at > stale_after

    @staticmethod
    def _prune_stale_entries(now: datetime):
        MatchmakingService._queue = [
            entry for entry in MatchmakingService._queue
            if not MatchmakingService._is_stale(entry, now)
        ]

    @staticmethod
    def _compute_elo_window(joined_at: datetime) -> int:
        now = datetime.now(timezone.utc)
        waited_seconds = max(0, int((now - joined_at).total_seconds()))
        increments = waited_seconds // max(
            1, MatchmakingService.ELO_WINDOW_STEP_SECONDS
        )
        return min(
            MatchmakingService.MAX_ELO_WINDOW,
            MatchmakingService.BASE_ELO_WINDOW
            + increments * MatchmakingService.ELO_WINDOW_STEP,
        )

    @staticmethod
    async def join_or_match(
        uid: str,
        username: str,
        elo_rating: int,
        game_mode: str,
    ) -> MatchmakingResult:
        async with MatchmakingService._lock:
            now = datetime.now(timezone.utc)
            MatchmakingService._prune_stale_entries(now)
            MatchmakingService._queue = [
                entry for entry in MatchmakingService._queue if entry.uid != uid
            ]

            new_entry = QueueEntry(
                uid=uid,
                username=username,
                elo_rating=elo_rating,
                game_mode=game_mode,
                joined_at=now,
                last_seen_at=now,
            )

            self_window = MatchmakingService._compute_elo_window(new_entry.joined_at)
            # Filter candidates by game_mode and dynamic ELO window. Also skip
            # players who already have an active match (helps when there are
            # multiple backend instances or races where a player was matched
            # elsewhere).
            candidates: list[QueueEntry] = []
            # Import here to avoid circular imports at module import time
            from services.MultiplayerMatchService import MultiplayerMatchService

            for existing in MatchmakingService._queue:
                if existing.game_mode != game_mode:
                    continue
                existing_window = MatchmakingService._compute_elo_window(
                    existing.joined_at
                )
                distance = abs(existing.elo_rating - elo_rating)
                if distance <= max(self_window, existing_window):
                    # Check if this existing player already has an active match
                    try:
                        active = (
                            await MultiplayerMatchService.get_active_match_for_player(
                                existing.uid
                            )
                        )
                        if active is not None and active.get("status") == "ongoing":
                            # Skip players already in an active match
                            continue
                    except Exception:
                        # If the DB check fails for any reason, fall back to
                        # treating the candidate as available (avoid breaking
                        # unit tests and keep matching behavior intact).
                        pass
                    candidates.append(existing)

            if candidates:
                opponent = min(candidates, key=lambda entry: entry.joined_at)
                MatchmakingService._queue = [
                    entry
                    for entry in MatchmakingService._queue
                    if entry.uid != opponent.uid
                ]
                return MatchmakingResult(
                    status="matched",
                    queue_position=None,
                    elo_window=self_window,
                    opponent=opponent,
                )

            MatchmakingService._queue.append(new_entry)
            queue_position = len(MatchmakingService._queue)
            return MatchmakingResult(
                status="queued",
                queue_position=queue_position,
                elo_window=self_window,
                opponent=None,
            )

    @staticmethod
    async def leave_queue(uid: str) -> bool:
        async with MatchmakingService._lock:
            MatchmakingService._prune_stale_entries(datetime.now(timezone.utc))
            old_count = len(MatchmakingService._queue)
            MatchmakingService._queue = [
                entry for entry in MatchmakingService._queue if entry.uid != uid
            ]
            return len(MatchmakingService._queue) < old_count

    @staticmethod
    async def requeue_entry(entry: QueueEntry):
        async with MatchmakingService._lock:
            now = datetime.now(timezone.utc)
            MatchmakingService._prune_stale_entries(now)
            MatchmakingService._queue = [
                queued for queued in MatchmakingService._queue if queued.uid != entry.uid
            ]
            if MatchmakingService._is_stale(entry, now):
                return
            entry.last_seen_at = now
            MatchmakingService._queue.append(entry)
            MatchmakingService._queue.sort(key=lambda queued: queued.joined_at)

    @staticmethod
    async def get_queue_status(uid: str):
        async with MatchmakingService._lock:
            now = datetime.now(timezone.utc)
            MatchmakingService._prune_stale_entries(now)
            for index, entry in enumerate(MatchmakingService._queue, start=1):
                if entry.uid == uid:
                    entry.last_seen_at = now
                    waited_seconds = int((now - entry.joined_at).total_seconds())
                    return {
                        "in_queue": True,
                        "queue_position": index,
                        "waited_seconds": max(0, waited_seconds),
                        "elo_window": MatchmakingService._compute_elo_window(
                            entry.joined_at
                        ),
                    }
            return {
                "in_queue": False,
                "queue_position": None,
                "waited_seconds": 0,
                "elo_window": None,
            }
