from fastapi import APIRouter, HTTPException
from services.UserServices import userServices
from models.UserModels import LoginRequest, LoginResponse

router = APIRouter(prefix="/users")

@router.post("/login")
def login(credentials: LoginRequest):
    '''Endpoint for user login. 
    It authenticates the user and returns a JWT access token if successful.'''
    authenticated = userServices.authenticate_user(credentials.username, credentials.password)
    if not authenticated:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user = userServices.get_user(credentials.username)
    access_token = userServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })

    return LoginResponse(access_token=access_token)
