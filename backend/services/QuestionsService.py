from typing import Literal
from db.database import execute, fetch_one, fetch_all


class QuestionsService:
    """Provides question-related operations"""
    
    @staticmethod
    async def get_rand_question(
        question_type: Literal["standard", "yes_no"] = "standard",
        ) -> dict | None:
        """Returns one random question, filtered by type."""
        
        if question_type == "standard":
            question = await fetch_one(
                """
                SELECT id, question_text, initials, correct_answer, category, difficulty
                FROM standard_questions
                ORDER BY RANDOM()
                LIMIT 1
                """
            )
        elif question_type == "yes_no":
            question = await fetch_one(
                """
                SELECT id, question_text, correct_answer, category
                FROM yes_no_questions
                ORDER BY RANDOM()
                LIMIT 1
                """
            )
        
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
        Answer is either a string (for standard questions) or a boolean (for yes/no questions).
        """
        
        if question_type == "standard":
            question = await fetch_one(
                """
                SELECT correct_answer
                FROM standard_questions
                WHERE id = :id
                """,
                {"id": question_id}
            )
            
            if not question:
                return None
            
            question = question._mapping
            correct_answer = question._mapping["correct_answer"]
            is_correct = answer.strip().lower() == correct_answer.strip().lower()
            
        elif question_type == "yes_no":
            question = await fetch_one(
                """
                SELECT correct_answer
                FROM yes_no_questions
                WHERE id = :id
                """,
                {"id": question_id}
            )
            
            if not question:
                return None
            
            question = question._mapping
            correct_answer = question["correct_answer"]
            is_correct = answer == correct_answer # correct_answer is bool
            
        return is_correct, correct_answer