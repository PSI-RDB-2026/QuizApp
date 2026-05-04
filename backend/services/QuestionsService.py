from typing import Literal
from db.database import execute, fetch_one, fetch_all
from services.AIAPI import AIAPI


class QuestionsService:
    """Provides question-related operations"""

    @staticmethod
    async def get_rand_question(
        question_type: Literal["standard", "yes_no"] = "standard",
        excluded_ids: list[int] | None = None,
    ) -> dict | None:
        """Returns one random question, filtered by type and excluding previously used questions."""

        excluded_ids = excluded_ids or []

        if question_type == "standard":
            if excluded_ids:
                question = await fetch_one("""
                    SELECT id, question_text, initials, correct_answer, category, difficulty
                    FROM standard_questions
                    WHERE id != ALL(:excluded_ids)
                    ORDER BY RANDOM()
                    LIMIT 1
                    """, {"excluded_ids": excluded_ids})
            else:
                question = await fetch_one("""
                    SELECT id, question_text, initials, correct_answer, category, difficulty
                    FROM standard_questions
                    ORDER BY RANDOM()
                    LIMIT 1
                    """)
        elif question_type == "yes_no":
            if excluded_ids:
                question = await fetch_one("""
                    SELECT id, question_text, correct_answer, category
                    FROM yes_no_questions
                    WHERE id != ALL(:excluded_ids)
                    ORDER BY RANDOM()
                    LIMIT 1
                    """, {"excluded_ids": excluded_ids})
            else:
                question = await fetch_one("""
                    SELECT id, question_text, correct_answer, category
                    FROM yes_no_questions
                    ORDER BY RANDOM()
                    LIMIT 1
                    """)

        if not question:
            return None

        question_map = question._mapping
        return dict(question_map, question_type=question_type)

    @staticmethod
    async def check_question(
        question_id: int,
        answer: str | bool,
        question_type: Literal["standard", "yes_no"] = "standard",
    ) -> tuple[bool, str] | None:
        """
        Validates answer for a question id and returns correctness + expected answer.
        Uses AI for intelligent evaluation of answers.
        Answer is either a string (for standard questions) or a boolean (for yes/no questions).
        """

        if question_type == "standard":
            question = await fetch_one(
                """
                SELECT question_text, correct_answer
                FROM standard_questions
                WHERE id = :id
                """,
                {"id": question_id},
            )

            if not question:
                return None

            question_map = question._mapping
            question_text = question_map["question_text"]
            correct_answer = question_map["correct_answer"]
            
            # Use AI to evaluate the answer
            is_correct = await AIAPI.check_answer(question_text, answer, correct_answer)

        elif question_type == "yes_no":
            question = await fetch_one(
                """
                SELECT question_text, correct_answer
                FROM yes_no_questions
                WHERE id = :id
                """,
                {"id": question_id},
            )

            if not question:
                return None

            question_map = question._mapping
            question_text = question_map["question_text"]
            correct_answer = question_map["correct_answer"]
            
            # Use AI to evaluate the answer
            is_correct = await AIAPI.check_answer(question_text, answer, correct_answer)

        return is_correct, correct_answer
