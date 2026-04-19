"""Integration tests for Users router with service-layer mocks."""

import pytest
from fastapi import HTTPException

from services.UserServices import UserServices


@pytest.fixture(autouse=True)
def mock_user_services(monkeypatch, sample_user):
    async def fake_authenticate_user(email: str, password: str) -> bool:
        return email == sample_user["email"] and password == sample_user["password"]

    async def fake_get_user(email: str):
        if email == sample_user["email"]:
            return {
                "username": sample_user["username"],
                "email": sample_user["email"],
                "password": sample_user["hashed_password"],
            }
        return None

    async def fake_create_access_token(data):
        return "test.jwt.token"

    async def fake_get_user_from_token(token: str):
        if token == "test.jwt.token":
            return (sample_user["username"], sample_user["email"])
        return None

    async def fake_create_user(credentials):
        return {"username": credentials.username, "email": credentials.email}

    async def fake_delete_user(username: str):
        return None

    monkeypatch.setattr(UserServices, "authenticate_user", staticmethod(fake_authenticate_user))
    monkeypatch.setattr(UserServices, "get_user", staticmethod(fake_get_user))
    monkeypatch.setattr(UserServices, "create_access_token", staticmethod(fake_create_access_token))
    monkeypatch.setattr(UserServices, "get_user_from_token", staticmethod(fake_get_user_from_token))
    monkeypatch.setattr(UserServices, "create_user", staticmethod(fake_create_user))
    monkeypatch.setattr(UserServices, "delete_user", staticmethod(fake_delete_user))


class TestUsersRouterLogin:
    def test_login_with_correct_credentials_returns_200(self, test_client, sample_user):
        payload = {"email": sample_user["email"], "password": sample_user["password"]}
        response = test_client.post("/api/users/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_with_incorrect_password_returns_401(self, test_client, sample_user):
        payload = {"email": sample_user["email"], "password": "wrong_password"}
        response = test_client.post("/api/users/login", json=payload)

        assert response.status_code == 401


class TestUsersRouterRegister:
    def test_register_with_valid_credentials_returns_200(self, test_client):
        payload = {
            "username": "new_user",
            "email": "newuser@example.com",
            "password": "new_password_123",
        }
        response = test_client.post("/api/users/register", json=payload)

        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_register_with_duplicate_email_returns_409(self, test_client, monkeypatch):
        async def fake_create_user_raises_duplicate(credentials):
            raise HTTPException(status_code=409, detail="Email already exists.")

        monkeypatch.setattr(
            UserServices,
            "create_user",
            staticmethod(fake_create_user_raises_duplicate),
        )

        payload = {
            "username": "existing_user",
            "email": "existing@example.com",
            "password": "new_password_123",
        }
        response = test_client.post("/api/users/register", json=payload)

        assert response.status_code == 409
        assert response.json()["detail"] == "Email already exists."

    def test_register_with_duplicate_username_returns_409(self, test_client, monkeypatch):
        async def fake_create_user_raises_duplicate(credentials):
            raise HTTPException(status_code=409, detail="Username already exists.")

        monkeypatch.setattr(
            UserServices,
            "create_user",
            staticmethod(fake_create_user_raises_duplicate),
        )

        payload = {
            "username": "existing_user",
            "email": "newemail@example.com",
            "password": "new_password_123",
        }
        response = test_client.post("/api/users/register", json=payload)

        assert response.status_code == 409
        assert response.json()["detail"] == "Username already exists."


class TestUsersRouterTokenRenew:
    def test_token_renew_with_valid_token_returns_200(self, test_client, sample_user):
        login_payload = {"email": sample_user["email"], "password": sample_user["password"]}
        login_response = test_client.post("/api/users/login", json=login_payload)
        old_token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {old_token}"}
        response = test_client.post("/api/users/token-renew", headers=headers)

        assert response.status_code == 200
        assert "access_token" in response.json()


class TestUsersRouterGetInfo:
    def test_get_user_info_with_valid_token_returns_200(self, test_client, sample_user):
        login_payload = {"email": sample_user["email"], "password": sample_user["password"]}
        login_response = test_client.post("/api/users/login", json=login_payload)
        token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/api/users/info", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == sample_user["username"]
        assert data["email"] == sample_user["email"]


class TestUsersRouterDeleteUser:
    def test_delete_user_with_valid_token_returns_success(self, test_client, sample_user):
        login_payload = {"email": sample_user["email"], "password": sample_user["password"]}
        login_response = test_client.post("/api/users/login", json=login_payload)
        token = login_response.json()["access_token"]

        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.delete("/api/users/user", headers=headers)

        assert response.status_code in [200, 204]
