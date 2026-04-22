from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from logging_config import configure_logging
from middleware import RequestContextMiddleware
import routers.questions as QuestionsRouter
import routers.health as HealthRouter
import routers.Users as UsersRouter
import routers.multiplayer as MultiplayerRouter
from db.database import close_db, init_db


configure_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    db_initialized = False
    try:
        await init_db()
        db_initialized = True
    except Exception as error:
        # Allow app startup while DB is not ready; mock services can still run.
        logger.warning("Database initialization skipped: %s", error, exc_info=True)
    try:
        yield
    finally:
        if db_initialized:
            await close_db()


app = FastAPI()

app.include_router(HealthRouter.router)
app.include_router(QuestionsRouter.router)
app.include_router(UsersRouter.router)
app.include_router(MultiplayerRouter.router)

app.add_middleware(RequestContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api")
async def root():
    '''Endpoint for the root path.'''
    return {"message": "Hello World, V2"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_config=None)