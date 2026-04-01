"""Data models for question retrieval and answer validation."""
from typing import Literal

from pydantic import BaseModel


class GetQuestionResponse(BaseModel):
    """Response model returned when requesting one question."""
    id: int
    question_type: Literal["standard", "yes_no"]
    question_text: str
    initials: str | None = None
    category: str | None = None
    difficulty: int | None = None


class CheckQuestionRequest(BaseModel):
    """Request model for answer validation."""
    question_id: int
    answer: str | bool
    question_type: Literal["standard", "yes_no"] | None = None


class CheckQuestionResponse(BaseModel):
    """Response model with validation result and the expected answer."""
    is_correct: bool
    correct_answer: str | bool