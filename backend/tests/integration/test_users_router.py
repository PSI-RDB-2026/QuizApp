"""Integration tests for users router with Firebase UID flow."""

import pytest

import routers.Users as users_router
from services.UserServices import UserServices


@pytest.fixture(autouse=True)
def mock_firebase_and_user_services(monkeypatch, sample_user):
    async def fake_get_user(uid: str):
        if uid == sample_user["uid"]:
            return {
                "uid": sample_user["uid"],
                "username": sample_user["username"],
                "elo_rating": sample_user["elo_rating"],
            }
        return None

    async def fake_create_user(payload):
        return {
            "uid": payload.uid,
            "username": payload.username,
            "elo_rating": 1200,
        }

    monkeypatch.setattr(UserServices, "get_user", staticmethod(fake_get_user))
    monkeypatch.setattr(UserServices, "create_user", staticmethod(fake_create_user))


class TestUsersRouter:
    def test_register_returns_201(self, test_client, sample_user):
        test_client.app.dependency_overrides[users_router.get_firebase_id] = (
            lambda: sample_user["uid"]
        )

        response = test_client.post(
            "/api/users/register",
            params={"username": sample_user["username"]},
        )

        test_client.app.dependency_overrides.clear()

        assert response.status_code == 201

    def test_get_info_returns_uid_username_elo(self, test_client, sample_user):
        test_client.app.dependency_overrides[users_router.get_firebase_id] = (
            lambda: sample_user["uid"]
        )

        response = test_client.get("/api/users/info")

        test_client.app.dependency_overrides.clear()

        assert response.status_code == 200
        data = response.json()
        assert data["uid"] == sample_user["uid"]
        assert data["username"] == sample_user["username"]
        assert data["elo_rating"] == sample_user["elo_rating"]

    def test_get_info_returns_404_when_user_missing(self, test_client):
        test_client.app.dependency_overrides[users_router.get_firebase_id] = (
            lambda: "missing-user"
        )

        response = test_client.get("/api/users/info")

        test_client.app.dependency_overrides.clear()

        assert response.status_code == 404
        assert response.json()["detail"] == "User not found in database."
