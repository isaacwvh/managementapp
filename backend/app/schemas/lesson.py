from typing import List, Optional, Literal
from pydantic import BaseModel
from datetime import date, time
from app.schemas.user import UserRead

AttendanceStatus = Literal["assigned", "attended", "missed", "cancelled"]
PaymentStatus = Literal["unpaid", "paid"]


class LessonBase(BaseModel):
    date: date
    time: time
    location: str
    price: int
    organisation_id: int


class LessonCreate(LessonBase):
    teacher_ids: List[int]
    student_ids: List[int]


class LessonStudentRead(BaseModel):
    lesson_id: int
    student_id: int
    attendance_status: AttendanceStatus
    payment_status: PaymentStatus
    student: UserRead

    class Config:
        orm_mode = True


class LessonStudentUpdate(BaseModel):
    attendance_status: Optional[AttendanceStatus] = None
    payment_status: Optional[PaymentStatus] = None


class LessonRead(LessonBase):
    id: int
    teachers: List[UserRead]
    student_links: List[LessonStudentRead]

    class Config:
        orm_mode = True