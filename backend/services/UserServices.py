from datetime import datetime, timedelta
import jwt
import os
from models.UserModels import RegisterRequest
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import HTTPException

ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in os.sys.path:
    os.sys.path.append(current_dir)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key_here")
# In a real application, use a secure key and store it safely

password_hasher = PasswordHasher()


class UserServices:
    '''
    This is a simple in-memory user service. In a real application, 
    you would likely use a database.
    '''
    USERS = {
        "test_user": {
            "username": "test_user",
            "password": password_hasher.hash("moje_heslo_123"),  # Zatím nehashované
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
    def authenticate_user(username: str, password: str) -> bool:
        '''Authenticate the user by checking the username and password.'''
        user = UserServices.USERS.get(username)
        if not user:
            return False
        if not UserServices.verify_password(user["password"], password):
            return False
        return True

    @staticmethod
    def get_user(username: str):
        '''Get user details by username.
        Returns None if the user does not exist.'''
        if username not in UserServices.USERS:
            return None
        return UserServices.USERS.get(username)

    @staticmethod
    def create_access_token(data: dict,
                            expires_delta: timedelta | None = None) -> str:
        '''Create a JWT access token with 
        the given data and expiration time.'''
        to_encode = data.copy()

        if expires_delta:
            expire = datetime.now() + expires_delta
        else:
            expire = datetime.now() + timedelta(minutes=JWT_EXPIRE_MINUTES)

        to_encode.update({"exp": expire})

        # print(str(to_encode), SECRET_KEY, ALGORITHM)  # Debugging output
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def get_user_from_token(token: str):
        """Function for getting code from user token (JWT)"""
        decoded = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        user_name = decoded["sub"]
        try:
            user = UserServices.USERS[user_name]
        except Exception:
            raise HTTPException(status_code=404, detail="Uživatel nenalezen.")
        return user if user else None

    @staticmethod
    def create_user(user: RegisterRequest) -> dict:
        """Function for create new user in memory"""
        new_user = {
            "username": user.username,
            "password": password_hasher.hash(user.password),
            "email": user.email
        }
        print(new_user)

        UserServices.USERS[user.username] = new_user
        return UserServices.USERS[user.username]

    @staticmethod
    def delete_user(user_name: str):
        """Function for delete user"""
        if user_name in UserServices.USERS:
            UserServices.USERS.pop(user_name)
        else:
            raise HTTPException(status_code=404, detail="Uživatel nenalezen.")
