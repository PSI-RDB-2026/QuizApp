from fastapi import APIRouter, HTTPException, Header, Request, Depends
from fastapi.responses import JSONResponse
import logging
from services.UserServices import UserServices
from models.UserModels import LoginRequest, TokenResponse, RegisterRequest
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db.database import execute, fetch_one, fetch_all

router = APIRouter(prefix="/api/users", tags=["users"])

security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.post("/login")
async def login(credentials: LoginRequest, response: JSONResponse) -> TokenResponse:
    '''Endpoint for user login.
    It authenticates the user and returns a JWT access token if successful.'''
    logger.info("login_attempt", extra={"email": credentials.email})
    authenticated = await UserServices.authenticate_user(
        credentials.email,
        credentials.password
    )
    if not authenticated:
        logger.warning("login_failed", extra={"email": credentials.email})
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )
    user = await UserServices.get_user(credentials.email)
    access_token = await UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    logger.info("login_succeeded", extra={"email": credentials.email, "username": user["username"]})

    return TokenResponse(access_token=access_token)


@router.post("/register")
async def register_user(credentials: RegisterRequest) -> TokenResponse:
    """Endpoint for registr new user"""
    logger.info("register_attempt", extra={"email": credentials.email, "username": credentials.username})
    user = await UserServices.create_user(credentials)
    token = await UserServices.create_access_token(data={
        "sub": user["username"],
        "email": user["email"]
    })
    logger.info("register_succeeded", extra={"email": user["email"], "username": user["username"]})
    return TokenResponse(access_token=token)


@router.post("/token-renew")
async def token_renew(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> TokenResponse:
    """Function for renew user token"""
    user = await UserServices.get_user_from_token(token=auth.credentials)
    new_token = await UserServices.create_access_token(data={
        "sub": user[0],
        "email": user[1]
    })
    logger.info("token_renewed", extra={"username": user[0], "email": user[1]})
    return TokenResponse(access_token=new_token)


@router.get("/info")
async def get_user_info(
    auth: HTTPAuthorizationCredentials = Depends(security)
) -> JSONResponse:
    """Endpoint for get authenticated user info"""
    user = await UserServices.get_user_from_token(token=auth.credentials)
    logger.debug("user_info_requested", extra={"username": user[0], "email": user[1]})
    return JSONResponse(content={
        "email": user[1],
        "username": user[0]
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
        await UserServices.delete_user(user[0])
        logger.info("delete_user_succeeded", extra={"username": user[0], "email": user[1]})
    except HTTPException:
        result = {
            "error": "user_not_found",
            "message": "User not found."
        }
        return JSONResponse(status_code=404, content=result)
