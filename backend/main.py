from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
import os
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://quizapp:quizapp_pass@postgres:5432/quizapp",
)

engine = create_async_engine(DATABASE_URL, echo=False)

async def is_db_available() -> bool:
    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False

@app.get("/api/health/db")
async def db_health_check():
    if await is_db_available():
        return {"db": "connected"}
    raise HTTPException(status_code=503, detail="Database is unavailable")

@app.get("/api/questions/random")
async def get_random_question():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT * FROM standard_questions ORDER BY RANDOM() LIMIT 1"))
        question = result.fetchone()
        if question:
            return {
                "id": question.id,
                "question_text": question.question_text,
                "answer": question.correct_answer,
                "category": question.category,
                "difficulty": question.difficulty
            }
        raise HTTPException(status_code=404, detail="No questions found")

@app.get("/api")
async def root():
    '''Endpoint for the root path.'''
    return {"message": "Hello World, V2"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)