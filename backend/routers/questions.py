from fastapi import APIRouter, HTTPException
from typing import Literal

from models.QuestionModels import (
    CheckQuestionRequest,
    CheckQuestionResponse,
    GetQuestionResponse,
)
from services.QuestionsService import QuestionsService


router = APIRouter(prefix="/api/questions", tags=["questions"])


@router.get("", response_model=GetQuestionResponse)
def get_question(
    question: str | None = None,
    question_type: Literal["standard", "yes_no"] | None = None,
) -> GetQuestionResponse:
    """Returns one question.

    Query parameter `question` is currently optional/unused and reserved for
    future filtering logic.
    """
    question_item = QuestionsService.get_question(question, question_type)
    if not question_item:
        raise HTTPException(status_code=404, detail="No questions found")

    return GetQuestionResponse(
        id=question_item["id"],
        question_type=question_item["question_type"],
        question_text=question_item["question_text"],
        category=question_item.get("category"),
        difficulty=question_item.get("difficulty"),
    )


@router.post("/check", response_model=CheckQuestionResponse)
def check_question(payload: CheckQuestionRequest) -> CheckQuestionResponse:
    """Checks whether a submitted answer is correct for the given question id."""
    result = QuestionsService.check_question(
        question_id=payload.question_id,
        answer=payload.answer,
        question_type=payload.question_type,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Question not found")

    is_correct, correct_answer = result
    return CheckQuestionResponse(is_correct=is_correct, correct_answer=correct_answer)