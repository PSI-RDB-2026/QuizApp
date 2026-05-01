import os
import logging
from difflib import SequenceMatcher

import google.generativeai as genai


class AIAPI:
    """Small wrapper for optional Gemini answer checking with fuzzy fallback."""

    _model = None
    _gemini_disabled = False
    _logger = logging.getLogger(__name__)

    @classmethod
    def initialize(cls) -> bool:
        if cls._model is not None:
            return True
        if cls._gemini_disabled:
            return False

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            cls._gemini_disabled = True
            cls._logger.warning("Gemini key missing; using fuzzy fallback only")
            return False

        model_name = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
        try:
            genai.configure(api_key=api_key)
            cls._model = genai.GenerativeModel(model_name)
            cls._logger.info("Gemini initialized", extra={"model": model_name})
            return True
        except Exception as exc:
            cls._gemini_disabled = True
            cls._logger.warning("Gemini init failed; using fuzzy fallback", extra={"error": str(exc)})
            return False

    @staticmethod
    def _fuzzy_decision(student_answer: str | bool, correct_answer: str | bool) -> tuple[str, str, float]:
        student = str(student_answer).strip().lower()
        correct = str(correct_answer).strip().lower()
        similarity = SequenceMatcher(None, student, correct).ratio()
        return student, correct, similarity

    @classmethod
    async def check_answer(
        cls,
        question_text: str,
        student_answer: str | bool,
        correct_answer: str | bool,
    ) -> bool:
        student, correct, similarity = cls._fuzzy_decision(student_answer, correct_answer)

        if student == correct:
            return True
        if similarity >= 0.85:
            return True

        if not cls.initialize():
            return similarity >= 0.75

        prompt = (
            "You are grading a quiz answer. Be lenient for typos, partial names, "
            "synonyms, and translations. Reply with only CORRECT or INCORRECT.\n\n"
            f"Question: {question_text}\n"
            f"Student Answer: {student_answer}\n"
            f"Correct Answer: {correct_answer}"
        )

        try:
            response = cls._model.generate_content(prompt)
            decision = (response.text or "").strip().upper() == "CORRECT"
            return decision
        except Exception as exc:
            error_text = str(exc).lower()
            if "resourceexhausted" in error_text or "quota exceeded" in error_text or "429" in error_text:
                cls._gemini_disabled = True
                cls._model = None
                cls._logger.warning("Gemini quota exceeded; disabling Gemini and using fallback")
            else:
                cls._logger.warning("Gemini call failed; using fallback", extra={"error": str(exc)})
            return similarity >= 0.75
