from typing import List, Optional
from pydantic import BaseModel
from datetime import date, time
from app.schemas.user import UserRead


class LessonBase(BaseModel):
    date: date
    time: time
    location: str
    price: int
    organisation_id: int


class LessonCreate(LessonBase):
    teacher_ids: List[int]
    student_ids: List[int]


class LessonStudentBase(BaseModel):
    attendance_status: str = "assigned"
    payment_status: str = "unpaid"


class LessonStudentRead(LessonStudentBase):
    student: UserRead

    class Config:
        orm_mode = True


class LessonStudentUpdate(BaseModel):
    attendance_status: Optional[str] = None
    payment_status: Optional[str] = None


class LessonRead(LessonBase):
    id: int
    teachers: List[UserRead]
    student_links: List[LessonStudentRead]

    class Config:
        orm_mode = True