from datetime import datetime, timedelta
import jwt
import os

ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60
SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # In a real application, use a secure key and store it safely

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

        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
