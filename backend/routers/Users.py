from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.responses import JSONResponse
from services.UserServices import UserServices
from models.UserModels import LoginRequest, TokenResponse, RegisterRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.database import execute, fetch_one, fetch_all

router = APIRouter(prefix="/api/users", tags=["users"])

security = HTTPBearer()


@router.post("/login")
async def login(credentials: LoginRequest, response: JSONResponse) -> TokenResponse:
    '''Endpoint for user login.
    It authenticates the user and returns a JWT access token if successful.'''
    authenticated = await UserServices.authenticate_user(
        credentials.email,
        credentials.password
    )
    if not authenticated:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    user = await UserServices.get_user(credentials.email)
    access_token = await UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })

    return TokenResponse(access_token=access_token)


@router.post("/register")
async def register_user(credentials: RegisterRequest) -> TokenResponse:
    """Endpoint for registr new user"""
    user = await UserServices.create_user(credentials)
    token = await UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    return TokenResponse(access_token=token)


@router.post("/token-renew")
async def token_renew(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> TokenResponse:
    """Function for renew user token"""
    user = await UserServices.get_user_from_token(token=auth.credentials)
    new_token = await UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    return TokenResponse(access_token=new_token)


@router.get("/info")
async def get_user_info(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> JSONResponse:
    """Endpoint for get authenticated user info"""
    user = await UserServices.get_user_from_token(token=auth.credentials)
    return JSONResponse(content={
        "email": user["email"],
        "username": user["username"]
    })


@router.delete("/user")
async def delete_user(
    auth: HTTPAuthorizationCredentials = Depends(security)
):
    """Endpoint for delete user"""
    try:
        user = await UserServices.get_user_from_token(token=auth.credentials)
        if user is None:
            result = {
                "error": "user_not_found",
                "message": "User not found."
            }
            return JSONResponse(status_code=404, content=result)
        await UserServices.delete_user(user["username"])
    except HTTPException:
        result = {
            "error": "user_not_found",
            "message": "User not found."
        }
        return JSONResponse(status_code=404, content=result)
