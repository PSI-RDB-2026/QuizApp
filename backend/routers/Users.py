from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import JSONResponse
import logging

from services.UserServices import UserServices
from models.UserModels import RegisterRequest
from dependencies import get_firebase_id

router = APIRouter(prefix="/api/users", tags=["users"])

logger = logging.getLogger(__name__)



@router.post("/register")
async def register_user(username: str, uid: str = Depends(get_firebase_id)):
    """Register Firebase-authenticated user in local DB."""
    logger.info("register_attempt", extra={"uid": uid, "username": username})
    user = await UserServices.create_user(RegisterRequest(username=username, uid=uid))
    logger.info("register_succeeded", extra={"uid": user["uid"], "username": user["username"]})
    return Response(status_code=201)


@router.get("/info")
async def get_user_info(
    uid: str = Depends(get_firebase_id)
) -> JSONResponse:
    """Get authenticated user info from local DB."""
    user = await UserServices.get_user(uid)
    if user is None:
        logger.warning("user_info_not_found", extra={"uid": uid})
        raise HTTPException(status_code=404,
                            detail="User not found in database.")
    logger.debug(
        "user_info_requested",
        extra={"uid": user["uid"], "username": user["username"]}
    )
    return JSONResponse(content={
        "uid": user["uid"],
        "username": user["username"],
        "elo_rating": user["elo_rating"],
    })
