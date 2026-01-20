from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.models.user import User
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.database import get_db
from app.utils import hash_password, get_current_user, get_current_admin
from app.email import create_email_token, send_verification_email


router = APIRouter(
    tags=["Users"]
)

# --- Create a new user ---
# @router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
# def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
#     existing_user = db.query(User).filter(User.email == user_data.email).first()
#     if existing_user:
#         raise HTTPException(status_code=400, detail="Email already registered")

#     hashed_password = hash_password(user_data.password)
#     new_user = User(
#         name=user_data.name,
#         email=user_data.email,
#         password=hashed_password,
#         role=user_data.role,
#         organisation_id=user_data.organisation_id
#     )
#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)
#     return new_user

@router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(user_data: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user_data.password)
    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password=hashed_password,
        role=user_data.role,
        organisation_id=user_data.organisation_id,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_email_token(new_user.email)
    background_tasks.add_task(send_verification_email, new_user.email, token)

    return new_user


# --- Get current user's profile ---
@router.get("/me", response_model=UserRead)
def get_my_user(current_user: User = Depends(get_current_user)):
    return current_user


# --- Update current user's profile ---
@router.put("/me", response_model=UserRead)
def update_my_user(update_data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if update_data.name:
        current_user.name = update_data.name
    if update_data.password:
        current_user.password = hash_password(update_data.password)
    db.commit()
    db.refresh(current_user)
    return current_user

#ADMIN ONLY:

# --- Get all users (all users) ---
@router.get("/", response_model=List[UserRead])
def get_all_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).filter(User.organisation_id == current_user.organisation_id).all()


# --- Get all teachers (all users) ---
@router.get("/teachers", response_model=List[UserRead])
def get_teachers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(User).filter(
        User.role == "teacher",
        User.organisation_id == current_user.organisation_id
    ).all()


# --- Get all students (all users) ---
@router.get("/students", response_model=List[UserRead])
def get_students(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(User).filter(User.role == "student", User.organisation_id == current_user.organisation_id).all()


# --- Get user by ID (all users) ---
@router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- Delete user by ID (admin only) ---
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
