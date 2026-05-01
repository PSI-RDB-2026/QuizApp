from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


QuestionType = Literal["standard", "yes_no"]
MatchStatus = Literal["ongoing", "completed", "aborted"]


class QueueJoinRequest(BaseModel):
    game_mode: str = "pyramid"


class QueueJoinResponse(BaseModel):
    status: Literal["queued", "matched"]
    queue_position: int | None = None
    matched_match_id: int | None = None
    opponent_uid: str | None = None
    opponent_username: str | None = None
    elo_window: int


class QueueStatusResponse(BaseModel):
    in_queue: bool
    queue_position: int | None = None
    waited_seconds: int = 0
    elo_window: int | None = None
    matched_match_id: int | None = None


class MatchParticipant(BaseModel):
    uid: str
    username: str
    elo_rating: int


class MatchStateResponse(BaseModel):
    id: int
    status: MatchStatus
    player1: MatchParticipant
    player2: MatchParticipant
    winner_uid: str | None = None
    player1_score: int = 0
    player2_score: int = 0
    started_at: datetime | None = None
    finished_at: datetime | None = None


class SubmitTurnRequest(BaseModel):
    tile_id: int = Field(gt=0)
    question_type: QuestionType
    question_id: int = Field(gt=0)
    is_correct: bool
    game_state: dict | None = None


class SubmitTurnResponse(BaseModel):
    match_id: int
    tile_id: int
    question_type: QuestionType
    question_id: int
    is_correct: bool
    player1_score: int
    player2_score: int


class ForfeitResponse(BaseModel):
    match_id: int
    status: MatchStatus
    winner_uid: str
    reason: str


class WebSocketEvent(BaseModel):
    event: str
    payload: dict
