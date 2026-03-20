from datetime import datetime, timedelta
import jwt
import os
from models.UserModels import RegisterRequest

ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in os.sys.path:
    os.sys.path.append(current_dir)
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key_here")  # In a real application, use a secure key and store it safely

class userServices:
    '''
    This is a simple in-memory user service. In a real application, 
    you would likely use a database.
    '''
    USERS = {
        "test_user": {
            "username": "test_user",
            "password": "moje_heslo_123",  # Zatím nehashované
            "email": "test@example.com"
        }
    }

    @staticmethod
    def authenticate_user(username: str, password: str) -> bool:
        '''Authenticate the user by checking the username and password.'''
        user = userServices.USERS.get(username)
        if not user:
            return False
        if user["password"] != password:
            return False
        return True

    @staticmethod
    def get_user(username: str):
        '''Get user details by username.
        Returns None if the user does not exist.'''
        if username not in userServices.USERS:
            return None
        return userServices.USERS.get(username)

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
        print(decoded)
        user_name = decoded["sub"]
        return userServices.USERS[user_name]

    @staticmethod
    def create_user(user: RegisterRequest) -> dict:
        """Function for create new user in memory"""
        new_user = {
            "username": user.username,
            "password": user.password,  # Zatím nehashované
            "email": user.email
        }

        userServices.USERS[user.username] = new_user
        return userServices.USERS[user.username]

