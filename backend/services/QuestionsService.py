"""Mock question service used before DB-backed implementation is available."""
import random
from typing import Literal


class QuestionsService:
    """Provides in-memory question retrieval and answer validation."""

    MOCK_STANDARD_QUESTIONS = [
        {
            "id": 1,
            "question_text": "What does HTTP stand for?",
            "correct_answer": "HyperText Transfer Protocol",
            "category": "IT",
            "difficulty": 1,
        },
        {
            "id": 2,
            "question_text": "Which planet is known as the Red Planet?",
            "correct_answer": "Mars",
            "category": "Science",
            "difficulty": 1,
        },
        {
            "id": 3,
            "question_text": "Who wrote Romeo and Juliet?",
            "correct_answer": "William Shakespeare",
            "category": "Literature",
            "difficulty": 2,
        },
    ]

    MOCK_YES_NO_QUESTIONS = [
        {
            "id": 1001,
            "question_text": "The Earth revolves around the Sun.",
            "correct_answer": "yes",
            "category": "Science",
        },
        {
            "id": 1002,
            "question_text": "Python is a compiled-only language.",
            "correct_answer": "no",
            "category": "IT",
        },
        {
            "id": 1003,
            "question_text": "Prague is the capital city of the Czech Republic.",
            "correct_answer": "yes",
            "category": "Geography",
        },
    ]

    @staticmethod
    def get_question(
        _: str | None = None,
        question_type: Literal["standard", "yes_no"] | None = None,
    ) -> dict | None:
        """Returns one mock question.

        The optional string parameter is intentionally unused for now and is
        reserved for future filtering/search logic.
        """
        if question_type == "standard":
            if not QuestionsService.MOCK_STANDARD_QUESTIONS:
                return None

            selected = random.choice(QuestionsService.MOCK_STANDARD_QUESTIONS)
            return {**selected, "question_type": "standard"}

        if question_type == "yes_no":
            if not QuestionsService.MOCK_YES_NO_QUESTIONS:
                return None

            selected = random.choice(QuestionsService.MOCK_YES_NO_QUESTIONS)
            return {**selected, "question_type": "yes_no"}

        merged_questions = [
            *[{**question, "question_type": "standard"} for question in QuestionsService.MOCK_STANDARD_QUESTIONS],
            *[{**question, "question_type": "yes_no"} for question in QuestionsService.MOCK_YES_NO_QUESTIONS],
        ]
        if not merged_questions:
            return None

        return random.choice(merged_questions)

    @staticmethod
    def check_question(
        question_id: int,
        answer: str,
        question_type: Literal["standard", "yes_no"] | None = None,
    ) -> tuple[bool, str] | None:
        """Validates answer for a question id and returns correctness + expected answer."""
        if question_type == "standard":
            question = next(
                (item for item in QuestionsService.MOCK_STANDARD_QUESTIONS if item["id"] == question_id),
                None,
            )
        elif question_type == "yes_no":
            question = next(
                (item for item in QuestionsService.MOCK_YES_NO_QUESTIONS if item["id"] == question_id),
                None,
            )
        else:
            question = next(
                (item for item in QuestionsService.MOCK_STANDARD_QUESTIONS if item["id"] == question_id),
                None,
            )
            if question is None:
                question = next(
                    (item for item in QuestionsService.MOCK_YES_NO_QUESTIONS if item["id"] == question_id),
                    None,
                )

        if question is None:
            return None

        correct_answer = question["correct_answer"]
        is_correct = answer.strip().lower() == correct_answer.strip().lower()
        return is_correct, correct_answer