from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    users = relationship("User", back_populates="organisation", cascade="all, delete-orphan")
    lessons = relationship("Lesson", back_populates="organisation")
    # invoices = relationship("Invoice", back_populates="organisation")
