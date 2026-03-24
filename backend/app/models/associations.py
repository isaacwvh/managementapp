from sqlalchemy import Table, Column, Integer, ForeignKey, String
from sqlalchemy.orm import relationship
from app.database import Base

lesson_teachers = Table(
    "lesson_teachers",
    Base.metadata,
    Column("lesson_id", Integer, ForeignKey("lessons.id")),
    Column("teacher_id", Integer, ForeignKey("users.id"))
)

class LessonStudent(Base):
    __tablename__ = "lesson_students"

    lesson_id = Column(Integer, ForeignKey("lessons.id"), primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), primary_key=True)

    attendance_status = Column(String, nullable=False, default="assigned")
    payment_status = Column(String, nullable=False, default="unpaid")

    lesson = relationship("Lesson", back_populates="student_links")
    student = relationship("User", back_populates="lesson_links")
