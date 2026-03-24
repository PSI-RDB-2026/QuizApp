from fastapi import APIRouter, HTTPException

from db.database import execute


router = APIRouter(prefix="/api")


async def is_db_available() -> bool:
	try:
		await execute("SELECT 1")
		return True
	except Exception:
		return False


@router.get("/health/db")
async def db_health_check():
	if await is_db_available():
		return {"db": "connected"}
	raise HTTPException(status_code=503, detail="Database is unavailable")
