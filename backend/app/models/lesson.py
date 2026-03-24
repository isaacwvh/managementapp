from sqlalchemy import Column, ForeignKey, Integer, String, Date, Time
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import lesson_teachers

class Lesson(Base):
    __tablename__ = "lessons"

    id = Column(Integer, primary_key=True)
    date = Column(Date, nullable=False)
    time = Column(Time, nullable=False)
    location = Column(String, nullable=False)
    price = Column(Integer, nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)

    
    organisation = relationship("Organisation", back_populates="lessons")

    teachers = relationship(
        "User",
        secondary=lesson_teachers,
        back_populates="teaching_lessons"
    )

    student_links = relationship(
        "LessonStudent",
        back_populates="lesson",
        cascade="all, delete-orphan"
    )
