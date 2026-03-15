from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import routers.Users as UsersRouter

app = FastAPI()

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
