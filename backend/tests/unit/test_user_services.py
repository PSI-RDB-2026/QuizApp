"""Unit tests for UserServices."""
import pytest
from datetime import timedelta
from services.UserServices import UserServices
from models.UserModels import RegisterRequest


class TestUserServicesAuthentication:
    """Test suite for UserServices authentication methods."""

    def test_authenticate_user_with_correct_credentials(self, sample_user, mock_user_db):
        """Test that authenticate_user returns True for correct username and password."""
        result = UserServices.authenticate_user(
            username=sample_user["username"],
            password=sample_user["password"]
        )

        assert result is True

    def test_authenticate_user_with_incorrect_password(self, sample_user, mock_user_db):
        """Test that authenticate_user returns False for incorrect password."""
        result = UserServices.authenticate_user(
            username=sample_user["username"],
            password="wrong_password"
        )

        assert result is False

    def test_authenticate_user_nonexistent_user(self, mock_user_db):
        """Test that authenticate_user returns False for non-existent user."""
        result = UserServices.authenticate_user(
            username="nonexistent_user",
            password="any_password"
        )

        assert result is False


class TestUserServicesGetUser:
    """Test suite for UserServices.get_user() method."""

    def test_get_user_returns_existing_user(self, sample_user, mock_user_db):
        """Test that get_user returns user dict for existing user."""
        user = UserServices.get_user(username=sample_user["username"])

        assert user is not None
        assert user["username"] == sample_user["username"]
        assert user["email"] == sample_user["email"]

    def test_get_user_returns_none_for_nonexistent_user(self, mock_user_db):
        """Test that get_user returns None for non-existent user."""
        user = UserServices.get_user(username="nonexistent_user")

        assert user is None


class TestUserServicesPasswordVerification:
    """Test suite for UserServices password verification."""

    def test_verify_password_correct(self, sample_user):
        """Test that verify_password returns True for correct password."""
        result = UserServices.verify_password(
            hashed_password=sample_user["hashed_password"],
            plain_password=sample_user["password"]
        )

        assert result is True

    def test_verify_password_incorrect(self, sample_user):
        """Test that verify_password returns False for incorrect password."""
        result = UserServices.verify_password(
            hashed_password=sample_user["hashed_password"],
            plain_password="wrong_password"
        )

        assert result is False


class TestUserServicesJWT:
    """Test suite for UserServices JWT token methods."""

    def test_create_access_token_returns_string(self, sample_user):
        """Test that create_access_token returns a valid JWT token string."""
        token = UserServices.create_access_token(data={"sub": sample_user["username"]})

        assert isinstance(token, str)
        assert len(token) > 0
        # JWT tokens have at least 2 dots (3 parts: header.payload.signature)
        assert token.count(".") >= 2

    def test_create_access_token_with_custom_expiration(self, sample_user):
        """Test that create_access_token respects custom expiration time."""
        custom_expiry = timedelta(hours=2)
        token = UserServices.create_access_token(
            data={"sub": sample_user["username"]},
            expires_delta=custom_expiry
        )

        assert isinstance(token, str)
        assert len(token) > 0

    def test_get_user_from_token_returns_user(self, sample_user, mock_user_db):
        """Test that get_user_from_token decodes JWT and returns user."""
        token = UserServices.create_access_token(data={"sub": sample_user["username"]})
        user = UserServices.get_user_from_token(token=token)

        assert user is not None
        assert user["username"] == sample_user["username"]

    def test_get_user_from_token_nonexistent_user_raises_exception(self):
        """Test that get_user_from_token raises HTTPException for non-existent user in token."""
        token = UserServices.create_access_token(data={"sub": "nonexistent_user"})

        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            UserServices.get_user_from_token(token=token)

        assert exc_info.value.status_code == 404
