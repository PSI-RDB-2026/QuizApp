from datetime import datetime, timedelta
import logging
import jwt
import os
from models.UserModels import RegisterRequest
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import HTTPException
from db.database import execute, fetch_one, fetch_all

ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in os.sys.path:
    os.sys.path.append(current_dir)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key_here")

password_hasher = PasswordHasher()
logger = logging.getLogger(__name__)


class UserServices:
    '''
    This is a simple in-memory user service. In a real application, 
    you would likely use a database.
    '''
    USERS = {
        "test_user": {
            "username": "test_user",
            "password": password_hasher.hash("moje_heslo_123"),
            "email": "test@example.com"
        }
    }

    @staticmethod
    def verify_password(hashed_password: str, plain_password: str) -> bool:
        """Function for verifying users"""
        try:
            return password_hasher.verify(hashed_password, plain_password)
        except VerificationError:
            return False
        except Exception:
            return False

    @staticmethod
    async def authenticate_user(email: str, password: str) -> bool:
        '''Authenticate the user by checking the email and password.'''
        user = await UserServices.get_user(email)
        if not user:
            logger.warning("authentication_failed_user_not_found", extra={"email": email})
            return False
        if not UserServices.verify_password(user["password"], password):
            logger.warning("authentication_failed_invalid_password", extra={"email": email})
            return False
        logger.info("authentication_succeeded", extra={"email": email})
        return True

    @staticmethod
    async def get_user(email: str):
        '''Get user details by email.
        Returns None if the user does not exist.'''
        try:
            user = await fetch_one(
                """
                SELECT username, password_hash AS password, email
                FROM users
                WHERE email = :email
                """,
                {"email": email}
            )
            logger.debug("user_fetched", extra={"email": email, "found": user is not None})
            return user._mapping
        except Exception as e:
            logger.exception("error_fetching_user", extra={"email": email})
            raise HTTPException(status_code=404, detail="Uživatel nenalezen.")
        return None

    @staticmethod
    async def create_access_token(
        data: dict,
        expires_delta: timedelta | None = None
    ) -> str:
        '''Create a JWT access token with
        the given data and expiration time.'''
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now() + expires_delta
        else:
            expire = datetime.now() + timedelta(minutes=JWT_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        logger.debug("access_token_created", extra={"email": data.get("email")})
        return encoded_jwt

    @staticmethod
    async def get_user_from_token(token: str):
        """Function for getting code from user token (JWT)"""
        decoded = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        email = decoded["email"]
        try:
            user = await fetch_one(
                """
                SELECT username, email
                FROM users
                WHERE email = :email
                """,
                {"email": email}
            )
            logger.debug("user_fetched_from_token", extra={"email": email, "found": user is not None})
        except Exception as e:
            logger.exception("error_fetching_user_from_token", extra={"email": email})
            raise HTTPException(status_code=404, detail="Uživatel nenalezen.")
        return user if user else None

    @staticmethod
    async def create_user(user: RegisterRequest) -> dict:
        """Function for create new user in memory"""
        new_user = {
            "username": user.username,
            "password": password_hasher.hash(user.password),
            "email": user.email
        }
        logger.info("user_creation_started", extra={"username": user.username, "email": user.email})
        crete_user_query = """
        INSERT INTO users (username, password_hash, email)
        VALUES (:username, :password, :email)
        """
        await execute(crete_user_query, new_user)

        user_from_db = await fetch_one(
            """
            SELECT username, email
            FROM users
            WHERE username = :username
            """,
            {"username": user.username}
        )
        user_from_db = user_from_db._mapping
        logger.info("user_created", extra={"username": user_from_db["username"], "email": user_from_db["email"]})
        return {
            "username": user_from_db["username"],
            "email": user_from_db["email"]
        }

    @staticmethod
    async def delete_user(user_name: str):
        """Function for delete user"""
        delete_user_query = """
        DELETE FROM users
        WHERE username = :username
        """
        try:
            await execute(delete_user_query, {"username": user_name})
            logger.info("user_deleted", extra={"username": user_name})
        except Exception as e:
            logger.exception("error_deleting_user", extra={"username": user_name})
            raise HTTPException(status_code=404, detail="Uživatel nenalezen.")
