from fastapi import APIRouter, HTTPException

from db.database import fetch_one


router = APIRouter(prefix="/api")


@router.get("/questions/standard/random")
async def get_random_question():
    question = await fetch_one(
        """
        SELECT id, question_text, correct_answer, category, difficulty
        FROM standard_questions
        ORDER BY RANDOM()
        LIMIT 1
        """
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

@router.get("/questions/yesno/random")
async def get_random_yesno_question():
    question = await fetch_one(
        """
        SELECT id, question_text, correct_answer, category
        FROM yes_no_questions
        ORDER BY RANDOM()
        LIMIT 1
        """
    )
    if not question:
        raise HTTPException(status_code=404, detail="No questions found")

    question_map = question._mapping
    return {
        "id": question_map["id"],
        "question_text": question_map["question_text"],
        "answer": question_map["correct_answer"],
        "category": question_map["category"],
    }