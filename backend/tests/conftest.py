"""Shared pytest fixtures for backend tests."""
import pytest
from fastapi.testclient import TestClient
from argon2 import PasswordHasher
from main import app
from services.QuestionsService import QuestionsService


password_hasher = PasswordHasher()


@pytest.fixture
def test_client():
    """Provides a FastAPI TestClient for making HTTP requests during tests."""
    return TestClient(app)


@pytest.fixture
def sample_user():
    """Provides a sample user dict for Firebase-based user tests."""
    plain_password = "test_password_123"
    return {
        "uid": "firebase-user-1",
        "username": "test_user",
        "elo_rating": 1200,
        "password": plain_password,
        "hashed_password": password_hasher.hash(plain_password),
    }


@pytest.fixture
def sample_question_standard():
    """Provides a sample standard multiple-choice question."""
    return {
        "id": 1,
        "question_text": "What does HTTP stand for?",
        "correct_answer": "HyperText Transfer Protocol",
        "category": "IT",
        "difficulty": 1,
        "question_type": "standard",
    }


@pytest.fixture
def sample_question_yes_no():
    """Provides a sample yes/no question."""
    return {
        "id": 1001,
        "question_text": "The Earth revolves around the Sun.",
        "correct_answer": "yes",
        "category": "Science",
        "question_type": "yes_no",
    }


@pytest.fixture
def mock_user_db(monkeypatch):
    """Mocks the UserServices.USERS in-memory database with test user."""
    return {}  # Remove obsolete in-memory user DB fixture


@pytest.fixture
def mock_question_db(monkeypatch):
    """Mocks QuestionsService methods to keep router tests DB-independent."""
    mock_standard = [
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
    ]
    mock_yes_no = [
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
    ]

    async def fake_get_rand_question(question_type="standard", excluded_ids=None):
        if question_type == "yes_no":
            question = mock_yes_no[0]
            return dict(question, question_type="yes_no")
        question = mock_standard[0]
        return dict(question, question_type="standard", initials=None)

    async def fake_check_question(question_id: int, answer, question_type="standard"):
        if question_type == "yes_no":
            question = next((q for q in mock_yes_no if q["id"] == question_id), None)
            if not question:
                return None
            correct_answer = question["correct_answer"]
            return answer == correct_answer, correct_answer

        question = next((q for q in mock_standard if q["id"] == question_id), None)
        if not question:
            return None
        correct_answer = question["correct_answer"]
        return str(answer).strip().lower() == correct_answer.lower(), correct_answer

    monkeypatch.setattr(QuestionsService, "get_rand_question", staticmethod(fake_get_rand_question))
    monkeypatch.setattr(QuestionsService, "check_question", staticmethod(fake_check_question))

    return {"standard": mock_standard, "yes_no": mock_yes_no}
