from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.responses import JSONResponse
from services.UserServices import UserServices
from models.UserModels import LoginRequest, TokenResponse, RegisterRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/users")

security = HTTPBearer()


@router.post("/login")
def login(credentials: LoginRequest, response: JSONResponse) -> TokenResponse:
    '''Endpoint for user login. 
    It authenticates the user and returns a JWT access token if successful.'''
    authenticated = UserServices.authenticate_user(credentials.username, credentials.password)
    if not authenticated:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    user = UserServices.get_user(credentials.username)
    access_token = UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })

    return TokenResponse(access_token=access_token)


@router.post("/register")
def register_user(credentials: RegisterRequest) -> TokenResponse:
    """Endpoint for registr new user"""
    user = UserServices.create_user(credentials)
    token = UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    return TokenResponse(access_token=token)


@router.post("/token-renew")
def token_renew(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> TokenResponse:
    """Function for renew user token"""
    user = UserServices.get_user_from_token(token=auth.credentials)
    new_token = UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    return TokenResponse(access_token=new_token)


@router.get("/info")
def get_user_info(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> JSONResponse:
    """Endpoint for get authenticated user info"""
    user = UserServices.get_user_from_token(token=auth.credentials)
    return JSONResponse(content={
        "email": user["email"],
        "username": user["username"]
    })
