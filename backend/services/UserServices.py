import logging

from firebase_admin import auth
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from models.UserModels import RegisterRequest
from db.database import execute, fetch_one

logger = logging.getLogger(__name__)


class UserServices:
    """User data access and token-backed user resolution."""

    @staticmethod
    def _row_to_dict(row) -> dict | None:
        if row is None:
            return None
        if isinstance(row, dict):
            return row
        if hasattr(row, "_mapping"):
            return dict(row._mapping)
        return dict(row)

    @staticmethod
    async def get_user(uid: str) -> dict | None:
        """Get user details by Firebase UID, or None if not found."""
        try:
            user = await fetch_one(
                """
                SELECT firebase_uid AS uid, username, elo_rating
                FROM users
                WHERE firebase_uid = :uid
                """,
                {"uid": uid},
            )
            logger.debug("user_fetched", extra={"uid": uid, "found": user is not None})
            return UserServices._row_to_dict(user)
        except Exception as exc:
            logger.exception("error_fetching_user", extra={"uid": uid})
            raise HTTPException(status_code=500, detail="Could not fetch user.") from exc

    @staticmethod
    async def create_user(user: RegisterRequest) -> dict:
        """Create user row for a Firebase-authenticated user."""
        new_user = {"uid": user.uid, "username": user.username}
        logger.info(
            "user_creation_started",
            extra={"uid": user.uid, "username": user.username},
        )
        create_user_query = """
        INSERT INTO users (firebase_uid, username)
        VALUES (:uid, :username)
        """
        try:
            await execute(create_user_query, new_user)
        except IntegrityError as e:
            error_text = str(getattr(e, "orig", e)).lower()
            if "users_pkey" in error_text or "firebase_uid" in error_text:
                logger.warning(
                    "user_creation_duplicate_uid",
                    extra={"uid": user.uid, "username": user.username},
                )
                raise HTTPException(status_code=409, detail="User already exists.") from e

            if "key (username)" in error_text or "users_username_key" in error_text:
                logger.warning(
                    "user_creation_duplicate_username",
                    extra={"uid": user.uid, "username": user.username},
                )
                raise HTTPException(
                    status_code=409,
                    detail="Username already exists.",
                ) from e

            logger.exception(
                "user_creation_integrity_error",
                extra={"uid": user.uid, "username": user.username},
            )
            raise HTTPException(status_code=500, detail="Could not create user.") from e
        except Exception as exc:
            logger.exception(
                "user_creation_failed",
                extra={"uid": user.uid, "username": user.username},
            )
            raise HTTPException(status_code=500, detail="Could not create user.") from exc

        user_from_db = await fetch_one(
            """
            SELECT firebase_uid AS uid, username, elo_rating
            FROM users
            WHERE firebase_uid = :uid
            """,
            {"uid": user.uid},
        )
        if user_from_db is None:
            logger.error(
                "user_created_but_not_fetchable",
                extra={"uid": user.uid, "username": user.username},
            )
            raise HTTPException(status_code=500, detail="Could not create user.")

        created_user = UserServices._row_to_dict(user_from_db)
        logger.info(
            "user_created",
            extra={"uid": created_user["uid"], "username": created_user["username"]},
        )
        return created_user

    @staticmethod
    async def get_user_from_token(token: str) -> dict:
        """Verify Firebase token and return user profile stored in DB."""
        try:
            decoded_token = auth.verify_id_token(token, clock_skew_seconds=10)
            uid = decoded_token["uid"]
        except Exception as exc:
            logger.warning("token_verification_failed", extra={"error": str(exc)})
            raise HTTPException(status_code=401, detail="Invalid token") from exc

        user = await UserServices.get_user(uid)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found in database.")
        return user
