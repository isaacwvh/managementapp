from typing import List
from pydantic import BaseModel
from datetime import date, time
from app.schemas.user import UserRead  # used to nest users inside lessons

class LessonBase(BaseModel):
    date: date
    time: time
    location: str
    price: int  # e.g., in cents
    organisation_id: int

class LessonCreate(LessonBase):
    teacher_ids: List[int]
    student_ids: List[int]
    organisation_id: int

class LessonRead(LessonBase):
    id: int
    teachers: List[UserRead]
    students: List[UserRead]

    class Config:
        orm_mode = True
