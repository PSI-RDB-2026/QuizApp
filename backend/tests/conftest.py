"""Shared pytest fixtures for backend tests."""
import pytest
from fastapi.testclient import TestClient
from argon2 import PasswordHasher
from main import app
from services.UserServices import UserServices
from services.QuestionsService import QuestionsService


password_hasher = PasswordHasher()


@pytest.fixture
def test_client():
    """Provides a FastAPI TestClient for making HTTP requests during tests."""
    return TestClient(app)


@pytest.fixture
def sample_user():
    """Provides a sample user dict for testing authentication."""
    plain_password = "test_password_123"
    return {
        "username": "test_user",
        "email": "test@example.com",
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
def mock_user_db(sample_user, monkeypatch):
    """Mocks the UserServices.USERS in-memory database with test user."""
    mock_users = {
        sample_user["username"]: {
            "username": sample_user["username"],
            "email": sample_user["email"],
            "password": sample_user["hashed_password"],
        }
    }
    # Patch the UserServices.USERS directly for this test
    monkeypatch.setattr(UserServices, "USERS", mock_users)
    return mock_users


@pytest.fixture
def mock_question_db(monkeypatch):
    """Mocks the QuestionsService question data."""
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
    # Patch the mock question data
    monkeypatch.setattr(QuestionsService, "MOCK_STANDARD_QUESTIONS", mock_standard)
    monkeypatch.setattr(QuestionsService, "MOCK_YES_NO_QUESTIONS", mock_yes_no)
    return {"standard": mock_standard, "yes_no": mock_yes_no}
