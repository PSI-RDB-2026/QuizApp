import json
import logging
import time

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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
    auth: HTTPAuthorizationCredentials = Depends(security),
):
    user_row = await UserServices.get_user_from_token(token=auth.credentials)
    username, uid = _extract_user_data(user_row)
    user_profile = await MultiplayerMatchService.get_user_profile(uid)
    return {
        "uid": uid,
        "username": username,
        "elo_rating": user_profile["elo_rating"],
    }


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

    match = await MultiplayerMatchService.create_match(opponent.uid, user["uid"])
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
async def queue_leave(user=Depends(_get_authenticated_user)):
    removed = await MatchmakingService.leave_queue(user["uid"])
    return {"removed": removed}


@router.get("/queue/status", response_model=QueueStatusResponse)
async def queue_status(user=Depends(_get_authenticated_user)) -> QueueStatusResponse:
    status = await MatchmakingService.get_queue_status(user["uid"])

    if not status["in_queue"]:
        active_match = await MultiplayerMatchService.get_active_match_for_player(
            user["uid"]
        )
        if active_match and active_match.get("status") == "ongoing":
            status["matched_match_id"] = active_match["id"]

    return QueueStatusResponse(**status)


@router.get("/matches/{match_id}", response_model=MatchStateResponse)
async def get_match(
    match_id: int, user=Depends(_get_authenticated_user)
) -> MatchStateResponse:
    await MultiplayerMatchService.ensure_participant(match_id, user["uid"])
    match = await MultiplayerMatchService.get_match(match_id)
    return MatchStateResponse(**match)


@router.post("/matches/{match_id}/turn", response_model=SubmitTurnResponse)
async def submit_turn(
    match_id: int,
    payload: SubmitTurnRequest,
    user=Depends(_get_authenticated_user),
) -> SubmitTurnResponse:
    turn_result = await MultiplayerMatchService.submit_turn(
        match_id=match_id,
        player_uid=user["uid"],
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
            "player_uid": user["uid"],
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
    match_id: int, user=Depends(_get_authenticated_user)
) -> ForfeitResponse:
    match = await MultiplayerMatchService.forfeit(match_id, user["uid"])
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
                    sender = payload.get("sender_email")
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
                        expected_email = (
                            match_info["player1"]["email"]
                            if turn == "player1"
                            else match_info["player2"]["email"]
                        )

                        if sender == expected_email:
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
        MultiplayerRealtimeService.schedule_disconnect_timer(
            match_id,
            player_uid,
            _forfeit_after_grace,
        )
