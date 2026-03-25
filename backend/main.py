from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

import backend.routers.questions as QuestionsRouter
import routers.health as HealthRouter
import routers.Users as UsersRouter
from db.database import close_db, init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    db_initialized = False
    try:
        await init_db()
        db_initialized = True
    except Exception as error:
        # Allow app startup while DB is not ready; mock services can still run.
        print(f"Database initialization skipped: {error}")
    try:
        yield
    finally:
        if db_initialized:
            await close_db()


app = FastAPI()

app.include_router(HealthRouter.router)
app.include_router(QuestionsRouter.router)
app.include_router(UsersRouter.router)

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
    uvicorn.run(app, host="0.0.0.0", port=8000)