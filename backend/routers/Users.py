from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.responses import JSONResponse
from services.UserServices import userServices
from models.UserModels import LoginRequest, TokenResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/users")

security = HTTPBearer()


@router.post("/login")
def login(credentials: LoginRequest, response: JSONResponse) -> TokenResponse:
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
    # response.headers["Authorization"] = f"Bearer {access_token}"
    # response.status_code = 202

    return TokenResponse(access_token=access_token)


@router.post("/token-renew")
def token_renew(auth: HTTPAuthorizationCredentials = Depends(security)) -> TokenResponse:
    """Function for renew user token"""
    print(auth.credentials)
    user = userServices.get_user_from_token(token=auth.credentials)
    new_token = userServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    return TokenResponse(access_token=new_token)
