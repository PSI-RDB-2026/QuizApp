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
async def get_question(
    question_type: Literal["standard", "yes_no"] = "standard",
) -> GetQuestionResponse:
    """Returns one random question, filtered by `question_type`."""
    question_item = await QuestionsService.get_rand_question(question_type)
    if not question_item:
        raise HTTPException(status_code=404, detail="No questions found")

    return GetQuestionResponse(
        id=question_item["id"],
        question_type=question_item["question_type"],
        question_text=question_item["question_text"],
        initials=question_item.get("initials"),
        category=question_item.get("category"),
        difficulty=question_item.get("difficulty"),
    )


@router.post("/check", response_model=CheckQuestionResponse)
async def check_question(payload: CheckQuestionRequest) -> CheckQuestionResponse:
    """
    Checks whether a submitted answer is correct for the given question id.
    answer is either a string (for standard questions) or a boolean (for yes/no questions).
    """
    result = await QuestionsService.check_question(
        question_id=payload.question_id,
        answer=payload.answer,
        question_type=payload.question_type or "standard",
    )
    if not question:
        raise HTTPException(status_code=404, detail="No questions found")

    question_map = question._mapping
    return {
        "id": question_map["id"],
        "question_text": question_map["question_text"],
        "answer": question_map["correct_answer"],
        "category": question_map["category"],
        "difficulty": question_map["difficulty"],
    }
