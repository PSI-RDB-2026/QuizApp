"""Unit tests for QuestionsService."""
import pytest
from services.QuestionsService import QuestionsService


class TestQuestionsServiceGetQuestion:
    """Test suite for QuestionsService.get_question() method."""

    def test_get_standard_question_returns_valid_structure(self, mock_question_db):
        """Test that get_question returns a question with correct structure when type='standard'."""
        question = QuestionsService.get_question(question_type="standard")

        assert question is not None
        assert "id" in question
        assert "question_text" in question
        assert "correct_answer" in question
        assert "category" in question
        assert "difficulty" in question
        assert question["question_type"] == "standard"

    def test_get_yes_no_question_returns_valid_structure(self, mock_question_db):
        """Test that get_question returns a question with correct structure when type='yes_no'."""
        question = QuestionsService.get_question(question_type="yes_no")

        assert question is not None
        assert "id" in question
        assert "question_text" in question
        assert "correct_answer" in question
        assert "category" in question
        assert question["question_type"] == "yes_no"

    def test_get_question_without_type_returns_mixed_types(self, mock_question_db):
        """Test that get_question without type filter returns questions of any type."""
        question = QuestionsService.get_question()

        assert question is not None
        assert "question_type" in question
        assert question["question_type"] in ["standard", "yes_no"]


class TestQuestionsServiceCheckQuestion:
    """Test suite for QuestionsService.check_question() method."""

    def test_check_standard_question_correct_answer(self, mock_question_db):
        """Test that check_question returns True for correct answer in standard question."""
        is_correct, correct_answer = QuestionsService.check_question(
            question_id=1,
            answer="HyperText Transfer Protocol",
            question_type="standard"
        )

        assert is_correct is True
        assert correct_answer == "HyperText Transfer Protocol"

    def test_check_standard_question_incorrect_answer(self, mock_question_db):
        """Test that check_question returns False for incorrect answer in standard question."""
        is_correct, correct_answer = QuestionsService.check_question(
            question_id=1,
            answer="Wrong Answer",
            question_type="standard"
        )

        assert is_correct is False
        assert correct_answer == "HyperText Transfer Protocol"

    def test_check_yes_no_question_correct_answer(self, mock_question_db):
        """Test that check_question validates yes/no questions correctly."""
        is_correct, correct_answer = QuestionsService.check_question(
            question_id=1001,
            answer="yes",
            question_type="yes_no"
        )

        assert is_correct is True
        assert correct_answer == "yes"

    def test_check_yes_no_question_incorrect_answer(self, mock_question_db):
        """Test that check_question returns False for incorrect yes/no answers."""
        is_correct, correct_answer = QuestionsService.check_question(
            question_id=1001,
            answer="no",
            question_type="yes_no"
        )

        assert is_correct is False
        assert correct_answer == "yes"

    def test_check_question_case_insensitive(self, mock_question_db):
        """Test that answer checking is case-insensitive."""
        # Standard question answer check (case-insensitive)
        is_correct, _ = QuestionsService.check_question(
            question_id=1,
            answer="hypertext transfer protocol",  # lowercase
            question_type="standard"
        )

        assert is_correct is True

    def test_check_question_nonexistent_id_returns_none(self, mock_question_db):
        """Test that check_question returns None for non-existent question id."""
        result = QuestionsService.check_question(
            question_id=9999,
            answer="Any Answer",
            question_type="standard"
        )

        assert result is None
