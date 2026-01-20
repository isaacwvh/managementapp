from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.associations import lesson_teachers, lesson_students

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, nullable=False)
    password = Column(String, nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"))  # <--- Foreign key column
    is_verified = Column(Boolean, default=False)

    organisation = relationship("Organisation", back_populates="users")  # <--- Relationship back to organisation

    teaching_lessons = relationship(
        "Lesson",
        secondary=lesson_teachers,
        back_populates="teachers"
    )

    attending_lessons = relationship(
        "Lesson",
        secondary=lesson_students,
        back_populates="students"
    )
