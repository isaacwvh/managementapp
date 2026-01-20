from fastapi import FastAPI
from app.api import routes
# from app.database import Base, engine
from app.api.routes import user, lesson, auth

# from app.models import user, lesson, associations, organisation
from contextlib import asynccontextmanager
from app.init_db import create_tables

from fastapi.middleware.cors import CORSMiddleware
import os


@asynccontextmanager
async def lifespan(app : FastAPI):
    create_tables()
    yield

app = FastAPI(lifespan=lifespan)

origins = [
    os.getenv("FRONTEND_API_URL"),  # React frontend default port
    os.getenv("BACKEND_API_URL")  # If you want to allow same origin
    # Add other allowed origins here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allows these origins
    allow_credentials=True,
    allow_methods=["*"],    # Allow all HTTP methods (GET, POST, etc)
    allow_headers=["*"],    # Allow all headers
)



#TODO Include routes
app.include_router(user.router, prefix="/users", tags=["Users"])
app.include_router(lesson.router, prefix="/lessons", tags=["Lessons"])
app.include_router(auth.router, prefix="/auth", tags=["Auth"])


#TODO: INDCLUDE CORS CHECKING 