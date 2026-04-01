"""Integration tests for Questions Router."""
import pytest
from fastapi.testclient import TestClient


class TestQuestionsRouterGetQuestion:
    """Integration tests for GET /api/questions endpoint."""

    def test_get_question_standard_returns_200(self, test_client, mock_question_db):
        """Test that GET /api/questions with standard filter returns 200 and valid question."""
        response = test_client.get("/api/questions", params={"question_type": "standard"})

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "question_type" in data
        assert data["question_type"] == "standard"
        assert "question_text" in data
        assert "category" in data

    def test_get_question_yes_no_returns_200(self, test_client, mock_question_db):
        """Test that GET /api/questions with yes_no filter returns 200 and valid question."""
        response = test_client.get("/api/questions", params={"question_type": "yes_no"})

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "question_type" in data
        assert data["question_type"] == "yes_no"
        assert "question_text" in data
        assert "category" in data

    def test_get_question_without_filter_returns_200(self, test_client, mock_question_db):
        """Test that GET /api/questions without filter returns 200 and valid question."""
        response = test_client.get("/api/questions")

        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "question_type" in data
        assert data["question_type"] in ["standard", "yes_no"]
        assert "question_text" in data

    def test_get_question_response_schema_matches_pydantic_model(self, test_client, mock_question_db):
        """Test that response matches GetQuestionResponse Pydantic model."""
        response = test_client.get("/api/questions", params={"question_type": "standard"})

        assert response.status_code == 200
        data = response.json()
        # Minimal validation that response is correct format
        assert isinstance(data, dict)
        assert isinstance(data.get("id"), int)
        assert isinstance(data.get("question_text"), str)
        assert isinstance(data.get("question_type"), str)


class TestQuestionsRouterCheckQuestion:
    """Integration tests for POST /api/questions/check endpoint."""

    def test_check_question_correct_answer_returns_200(self, test_client, mock_question_db):
        """Test that POST /api/questions/check returns 200 with is_correct=True for correct answer."""
        payload = {
            "question_id": 1,
            "answer": "HyperText Transfer Protocol",
            "question_type": "standard"
        }
        response = test_client.post("/api/questions/check", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        assert "correct_answer" in data

    def test_check_question_incorrect_answer_returns_200(self, test_client, mock_question_db):
        """Test that POST /api/questions/check returns 200 with is_correct=False for incorrect answer."""
        payload = {
            "question_id": 1,
            "answer": "Wrong Answer",
            "question_type": "standard"
        }
        response = test_client.post("/api/questions/check", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False
        assert data["correct_answer"] == "HyperText Transfer Protocol"

    def test_check_yes_no_question_returns_200(self, test_client, mock_question_db):
        """Test that POST /api/questions/check works for yes/no questions."""
        payload = {
            "question_id": 1001,
            "answer": "yes",
            "question_type": "yes_no"
        }
        response = test_client.post("/api/questions/check", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True

    def test_check_question_nonexistent_id_returns_404(self, test_client, mock_question_db):
        """Test that POST /api/questions/check returns 404 for non-existent question."""
        payload = {
            "question_id": 9999,
            "answer": "Any Answer",
            "question_type": "standard"
        }
        response = test_client.post("/api/questions/check", json=payload)

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_check_question_response_schema_matches_model(self, test_client, mock_question_db):
        """Test that response matches CheckQuestionResponse Pydantic model."""
        payload = {
            "question_id": 1,
            "answer": "HyperText Transfer Protocol",
            "question_type": "standard"
        }
        response = test_client.post("/api/questions/check", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("is_correct"), bool)
        assert isinstance(data.get("correct_answer"), str)
