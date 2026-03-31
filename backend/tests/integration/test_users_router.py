"""Integration tests for Users Router."""
from services.UserServices import UserServices


class TestUsersRouterLogin:
    """Integration tests for POST /users/login endpoint."""

    def test_login_with_correct_credentials_returns_200(self, test_client, sample_user, mock_user_db):
        """Test that POST /users/login returns 200 and token for correct credentials."""
        payload = {
            "username": sample_user["username"],
            "password": sample_user["password"]
        }
        response = test_client.post("/users/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_login_with_incorrect_password_returns_401(self, test_client, sample_user, mock_user_db):
        """Test that POST /users/login returns 401 for incorrect password."""
        payload = {
            "username": sample_user["username"],
            "password": "wrong_password"
        }
        response = test_client.post("/users/login", json=payload)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_login_with_nonexistent_user_returns_401(self, test_client, mock_user_db):
        """Test that POST /users/login returns 401 for non-existent user."""
        payload = {
            "username": "nonexistent_user",
            "password": "any_password"
        }
        response = test_client.post("/users/login", json=payload)

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_login_response_schema_matches_model(self, test_client, sample_user, mock_user_db):
        """Test that login response matches TokenResponse Pydantic model."""
        payload = {
            "username": sample_user["username"],
            "password": sample_user["password"]
        }
        response = test_client.post("/users/login", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("access_token"), str)
        assert data.get("token_type") == "bearer"


class TestUsersRouterRegister:
    """Integration tests for POST /users/register endpoint."""

    def test_register_with_valid_credentials_returns_200(self, test_client, mock_user_db):
        """Test that POST /users/register returns 200 and token for valid new user."""
        payload = {
            "username": "new_user",
            "email": "newuser@example.com",
            "password": "new_password_123"
        }
        response = test_client.post("/users/register", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert len(data["access_token"]) > 0

    def test_register_response_schema_matches_model(self, test_client, mock_user_db):
        """Test that register response matches TokenResponse Pydantic model."""
        payload = {
            "username": "another_new_user",
            "email": "another@example.com",
            "password": "another_password_123"
        }
        response = test_client.post("/users/register", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data.get("access_token"), str)
        assert data.get("token_type") == "bearer"


class TestUsersRouterTokenRenew:
    """Integration tests for POST /users/token-renew endpoint."""

    def test_token_renew_with_valid_token_returns_200(self, test_client, sample_user, mock_user_db):
        """Test that POST /users/token-renew returns 200 and new token for valid JWT."""
        # First, login to get a token
        login_payload = {
            "username": sample_user["username"],
            "password": sample_user["password"]
        }
        login_response = test_client.post("/users/login", json=login_payload)
        old_token = login_response.json()["access_token"]

        # Now renew the token
        headers = {"Authorization": f"Bearer {old_token}"}
        response = test_client.post("/users/token-renew", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Token shape should remain valid
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

    def test_token_renew_without_token_returns_401(self, test_client):
        """Test that POST /users/token-renew returns 401 when no auth header provided."""
        response = test_client.post("/users/token-renew")

        assert response.status_code == 401


class TestUsersRouterGetInfo:
    """Integration tests for GET /users/info endpoint."""

    def test_get_user_info_with_valid_token_returns_200(self, test_client, sample_user, mock_user_db):
        """Test that GET /users/info returns 200 and user data for valid JWT."""
        # First, login to get a token
        login_payload = {
            "username": sample_user["username"],
            "password": sample_user["password"]
        }
        login_response = test_client.post("/users/login", json=login_payload)
        token = login_response.json()["access_token"]

        # Get user info
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.get("/users/info", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["username"] == sample_user["username"]
        assert data["email"] == sample_user["email"]

    def test_get_user_info_without_token_returns_401(self, test_client):
        """Test that GET /users/info returns 401 when no auth header provided."""
        response = test_client.get("/users/info")

        assert response.status_code == 401

    def test_get_user_info_with_invalid_token_returns_404(self, test_client):
        """Test that GET /users/info returns 404 for invalid/non-existent user in token."""
        invalid_token = UserServices.create_access_token(data={"sub": "nonexistent_user"})
        headers = {"Authorization": f"Bearer {invalid_token}"}

        response = test_client.get("/users/info", headers=headers)
        assert response.status_code == 404


class TestUsersRouterDeleteUser:
    """Integration tests for DELETE /users/user endpoint."""

    def test_delete_user_with_valid_token_returns_success(self, test_client, sample_user, mock_user_db):
        """Test that DELETE /users/user removes user for valid JWT."""
        # First, login to get a token
        login_payload = {
            "username": sample_user["username"],
            "password": sample_user["password"]
        }
        login_response = test_client.post("/users/login", json=login_payload)
        token = login_response.json()["access_token"]

        # Delete user
        headers = {"Authorization": f"Bearer {token}"}
        response = test_client.delete("/users/user", headers=headers)

        # Should return success (2xx or 200)
        assert response.status_code in [200, 204]

    def test_delete_user_without_token_returns_401(self, test_client):
        """Test that DELETE /users/user returns 401 when no auth header provided."""
        response = test_client.delete("/users/user")

        assert response.status_code == 401
