from typing import List, Optional
from pydantic import BaseModel, EmailStr

# Shared fields between Create & Read
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str  # "teacher" or "student"
    organisation_id: Optional[int]

# For creating a user (input)
class UserCreate(UserBase):
    password: str  # plain password, will be hashed in backend

# For reading a user (output)
class UserRead(UserBase):
    id: int
    is_verified: bool

    class Config:
        orm_mode = True

# Optional: Used for PATCH or PUT updates
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    password: Optional[str] = None
