from sqlalchemy import Table, Column, Integer, ForeignKey
from app.database import Base

lesson_teachers = Table(
    "lesson_teachers",
    Base.metadata,
    Column("lesson_id", Integer, ForeignKey("lessons.id")),
    Column("teacher_id", Integer, ForeignKey("users.id"))
)

lesson_students = Table(
    "lesson_students",
    Base.metadata,
    Column("lesson_id", Integer, ForeignKey("lessons.id")),
    Column("student_id", Integer, ForeignKey("users.id"))
)
