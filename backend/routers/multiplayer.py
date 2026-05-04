import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from dependencies import get_firebase_id
import dependencies as deps
from models.MultiplayerModels import (
    ForfeitResponse,
    MatchStateResponse,
    QueueJoinRequest,
    QueueJoinResponse,
    QueueStatusResponse,
    SubmitTurnRequest,
    SubmitTurnResponse,
)
from services.MatchmakingService import MatchmakingService
from services.MultiplayerMatchService import MultiplayerMatchService
from services.MultiplayerRealtimeService import MultiplayerRealtimeService
from services.UserServices import UserServices

router = APIRouter(prefix="/api/multiplayer", tags=["multiplayer"])
security = HTTPBearer()
logger = logging.getLogger(__name__)


def _extract_user_data(user_row) -> tuple[str, str]:
    if user_row is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    if hasattr(user_row, "_mapping"):
        user_map = user_row._mapping
        return user_map["username"], user_map["uid"]

    if isinstance(user_row, dict):
        return user_row["username"], user_row["uid"]

    if isinstance(user_row, (tuple, list)) and len(user_row) >= 2:
        return str(user_row[0]), str(user_row[1])

    raise HTTPException(status_code=401, detail="Invalid token")


async def _get_authenticated_user(
    uid: str = Depends(get_firebase_id),
):
    # First try to fetch user from the DB
    user = None
    try:
        user = await UserServices.get_user(uid)
    except Exception as exc:
        cached = deps._user_token_cache.get(uid)
        if cached is None:
            logger.exception("db_lookup_failed_for_authenticated_user", extra={"uid": uid})
            raise HTTPException(status_code=503, detail="Database unavailable") from exc
        user = cached

    if user is None:
        cached = deps._user_token_cache.get(uid)
        if cached is None:
            raise HTTPException(status_code=401, detail="User not found")
        user = cached

    return {"uid": user["uid"], "username": user["username"], "elo_rating": user.get("elo_rating")} 


def _serialize_model(model) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump(mode="json")
    return model.dict()


@router.post("/queue/join", response_model=QueueJoinResponse)
async def queue_join(
    payload: QueueJoinRequest,
    user=Depends(_get_authenticated_user),
) -> QueueJoinResponse:
    result = await MatchmakingService.join_or_match(
        uid=user["uid"],
        username=user["username"],
        elo_rating=user["elo_rating"],
        game_mode=payload.game_mode,
    )

    if result.status == "queued":
        return QueueJoinResponse(
            status="queued",
            queue_position=result.queue_position,
            elo_window=result.elo_window,
        )

    opponent = result.opponent
    if not opponent:
        raise HTTPException(status_code=500, detail="Matchmaking failed")

    try:
        match = await MultiplayerMatchService.create_match(opponent.uid, user["uid"])
    except Exception as exc:
        await MatchmakingService.requeue_entry(opponent)
        if isinstance(exc, HTTPException):
            raise
        logger.exception(
            "match_creation_failed_after_queue_match",
            extra={"opponent_uid": opponent.uid, "uid": user["uid"]},
        )
        raise HTTPException(status_code=503, detail="Match creation failed") from exc
    logger.info(
        "matchmaking_matched",
        extra={
            "match_id": match["id"],
            "player1": opponent.uid,
            "player2": user["uid"],
        },
    )
    return QueueJoinResponse(
        status="matched",
        matched_match_id=match["id"],
        opponent_uid=opponent.uid,
        opponent_username=opponent.username,
        elo_window=result.elo_window,
    )


@router.post("/queue/leave")
async def queue_leave(uid: str = Depends(get_firebase_id), user: dict | None = None):
    # Accept `user` kw for unit tests calling this function directly.
    effective_uid = user.get("uid") if isinstance(user, dict) and user.get("uid") else uid
    removed = await MatchmakingService.leave_queue(effective_uid)
    return {"removed": removed}


@router.get("/queue/status", response_model=QueueStatusResponse)
async def queue_status(uid: str = Depends(get_firebase_id)) -> QueueStatusResponse:
    status = await MatchmakingService.get_queue_status(uid)

    if not status["in_queue"]:
        active_match = await MultiplayerMatchService.get_active_match_for_player(
            uid
        )
        if active_match and active_match.get("status") == "ongoing":
            status["matched_match_id"] = active_match["id"]

    return QueueStatusResponse(**status)


@router.get("/matches/{match_id}", response_model=MatchStateResponse)
async def get_match(
    match_id: int, uid: str = Depends(get_firebase_id)
) -> MatchStateResponse:
    await MultiplayerMatchService.ensure_participant(match_id, uid)
    match = await MultiplayerMatchService.get_match(match_id)
    return MatchStateResponse(**match)


@router.post("/matches/{match_id}/turn", response_model=SubmitTurnResponse)
async def submit_turn(
    match_id: int,
    payload: SubmitTurnRequest,
    uid: str = Depends(get_firebase_id),
) -> SubmitTurnResponse:
    turn_result = await MultiplayerMatchService.submit_turn(
        match_id=match_id,
        player_uid=uid,
        tile_id=payload.tile_id,
        question_type=payload.question_type,
        question_id=payload.question_id,
        is_correct=payload.is_correct,
    )

    await MultiplayerRealtimeService.broadcast(
        match_id,
        "score_updated",
        {
            "match_id": match_id,
            "player_uid": uid,
            "player1_score": turn_result["player1_score"],
            "player2_score": turn_result["player2_score"],
            "tile_id": payload.tile_id,
            "is_correct": payload.is_correct,
        },
    )

    if payload.game_state:
        MultiplayerRealtimeService.set_snapshot(match_id, payload.game_state)
        await MultiplayerRealtimeService.broadcast(
            match_id,
            "game_snapshot",
            {"snapshot": payload.game_state},
        )

    return SubmitTurnResponse(**turn_result)


@router.post("/matches/{match_id}/forfeit", response_model=ForfeitResponse)
async def forfeit_match(
    match_id: int, uid: str = Depends(get_firebase_id)
) -> ForfeitResponse:
    match = await MultiplayerMatchService.forfeit(match_id, uid)
    MultiplayerRealtimeService.clear_snapshot(match_id)
    await MultiplayerRealtimeService.broadcast(
        match_id,
        "match_finished",
        {
            "match_id": match_id,
            "status": match["status"],
            "winner_uid": match["winner_uid"],
            "reason": "forfeit",
        },
    )
    return ForfeitResponse(
        match_id=match_id,
        status=match["status"],
        winner_uid=match["winner_uid"],
        reason="forfeit",
    )


@router.websocket("/ws/{match_id}")
async def multiplayer_ws(websocket: WebSocket, match_id: int):
    token = websocket.query_params.get("token")
    # Support token via query param (legacy client) or Authorization header (Bearer <token>)
    token = websocket.query_params.get("token")
    if not token:
        auth_header = websocket.headers.get("authorization")
        if isinstance(auth_header, str) and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1]

    if not token:
        await websocket.close(code=1008, reason="Missing token")
        return

    try:
        user_row = await UserServices.get_user_from_token(token=token)
        _, player_uid = _extract_user_data(user_row)
        await MultiplayerMatchService.ensure_participant(match_id, player_uid)
    except HTTPException:
        await websocket.close(code=1008, reason="Unauthorized")
        return

    await MultiplayerRealtimeService.connect(match_id, player_uid, websocket)

    snapshot = await MultiplayerMatchService.get_match(match_id)
    await MultiplayerRealtimeService.send_to_player(
        match_id,
        player_uid,
        "match_snapshot",
        {
            "match": _serialize_model(MatchStateResponse(**snapshot)),
        },
    )

    stored_snapshot = MultiplayerRealtimeService.get_snapshot(match_id)
    if stored_snapshot is not None:
        await MultiplayerRealtimeService.send_to_player(
            match_id,
            player_uid,
            "game_snapshot",
            {"snapshot": stored_snapshot},
        )

    await MultiplayerRealtimeService.broadcast(
        match_id,
        "player_connected",
        {"match_id": match_id, "player_uid": player_uid},
    )

    match_snapshot = await MultiplayerMatchService.get_match(match_id)
    participant_uids = {match_snapshot["player1"]["uid"], match_snapshot["player2"]["uid"]}

    if MultiplayerRealtimeService.has_both_players_connected(match_id, participant_uids):
        MultiplayerRealtimeService.cancel_match_start_timer(match_id)
        await MultiplayerRealtimeService.broadcast(
            match_id,
            "both_players_connected",
            {
                "match_id": match_id,
                "player_uids": sorted(participant_uids),
            },
        )
    else:
        async def _forfeit_missing_start_player(expired_match_id: int):
            try:
                match = await MultiplayerMatchService.get_match(expired_match_id)
            except HTTPException:
                return

            connected_player_uids = MultiplayerRealtimeService.get_connected_player_uids(
                expired_match_id
            )
            if len(connected_player_uids) != 1:
                return

            active_uid = next(iter(connected_player_uids))
            inactive_uid = (
                match["player1"]["uid"]
                if match["player1"]["uid"] != active_uid
                else match["player2"]["uid"]
            )

            try:
                match = await MultiplayerMatchService.forfeit(expired_match_id, inactive_uid)
            except HTTPException:
                return

            MultiplayerRealtimeService.clear_snapshot(expired_match_id)
            await MultiplayerRealtimeService.broadcast(
                expired_match_id,
                "match_finished",
                {
                    "match_id": expired_match_id,
                    "status": match["status"],
                    "winner_uid": match["winner_uid"],
                    "reason": "connect_timeout",
                },
            )

        MultiplayerRealtimeService.schedule_match_start_timer(
            match_id,
            _forfeit_missing_start_player,
        )

    async def _forfeit_after_grace(expired_match_id: int, expired_player_uid: str):
        try:
            match = await MultiplayerMatchService.forfeit(expired_match_id, expired_player_uid)
        except HTTPException:
            return

        MultiplayerRealtimeService.clear_snapshot(expired_match_id)

        await MultiplayerRealtimeService.broadcast(
            expired_match_id,
            "match_finished",
            {
                "match_id": expired_match_id,
                "status": match["status"],
                "winner_uid": match["winner_uid"],
                "reason": "disconnect_timeout",
            },
        )

    try:
        while True:
            raw_message = await websocket.receive_text()
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError:
                await MultiplayerRealtimeService.send_to_player(
                    match_id,
                    player_uid,
                    "error",
                    {"detail": "Invalid JSON payload"},
                )
                continue

            msg_type = data.get("type")
            if msg_type == "ping":
                await MultiplayerRealtimeService.send_to_player(
                    match_id,
                    player_uid,
                    "pong",
                    {"match_id": match_id},
                )
            elif msg_type == "state_request":
                state = await MultiplayerMatchService.get_match(match_id)
                await MultiplayerRealtimeService.send_to_player(
                    match_id,
                    player_uid,
                    "match_snapshot",
                    {"match": _serialize_model(MatchStateResponse(**state))},
                )
                stored_snapshot = MultiplayerRealtimeService.get_snapshot(match_id)
                if stored_snapshot is not None:
                    await MultiplayerRealtimeService.send_to_player(
                        match_id,
                        player_uid,
                        "game_snapshot",
                        {"snapshot": stored_snapshot},
                    )
            elif msg_type == "game_snapshot":
                snapshot = data.get("snapshot")
                if isinstance(snapshot, dict):
                    MultiplayerRealtimeService.set_snapshot(match_id, snapshot)
                    await MultiplayerRealtimeService.broadcast(
                        match_id,
                        "game_snapshot",
                        {"snapshot": snapshot},
                    )
            elif msg_type == "timer_update":
                payload = data.get("payload")
                if isinstance(payload, dict):
                    # Validate that the sender corresponds to the claimed turn owner
                    sender = payload.get("sender_uid")
                    turn = payload.get("turnPlayer")
                    try:
                        match_info = await MultiplayerMatchService.get_match(match_id)
                    except HTTPException:
                        match_info = None

                    if (
                        isinstance(sender, str)
                        and isinstance(turn, str)
                        and match_info is not None
                    ):
                        expected_uid = (
                            match_info["player1"]["uid"]
                            if turn == "player1"
                            else match_info["player2"]["uid"]
                        )

                        if sender == expected_uid:
                            # Attach a server timestamp to provide monotonic ordering
                            payload["server_ts"] = time.time()
                            await MultiplayerRealtimeService.broadcast(
                                match_id, "timer_update", payload
                            )
                        else:
                            await MultiplayerRealtimeService.send_to_player(
                                match_id,
                                player_uid,
                                "error",
                                {
                                    "detail": "Not authorized to send timer updates for this turn"
                                },
                            )
    except WebSocketDisconnect:
        MultiplayerRealtimeService.disconnect(match_id, player_uid)
        await MultiplayerRealtimeService.broadcast(
            match_id,
            "player_disconnected",
            {"match_id": match_id, "player_uid": player_uid},
        )
        MultiplayerRealtimeService.cancel_match_start_timer(match_id)
        MultiplayerRealtimeService.schedule_disconnect_timer(
            match_id,
            player_uid,
            _forfeit_after_grace,
        )
