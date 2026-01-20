from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lesson import Lesson
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonRead
from app.utils import get_current_user, get_current_teacher, get_current_admin

router = APIRouter(tags=["Lessons"])

#FOR STUDENTS: GET UPCOMING LESSONS
@router.get("/my-upcoming", response_model=List[LessonRead])
def get_my_upcoming_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students only",
        )

    today = date.today()

    return (
        db.query(Lesson)
        .filter(
            Lesson.students.any(id=current_user.id),
            Lesson.date >= today,
        )
        .order_by(Lesson.date.asc(), Lesson.time.asc())
        .all()
    )


# ✅ TEACHER: Create a lesson (teacher auto-added)
@router.post("/", response_model=LessonRead) 
def create_lesson(
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    if lesson_data.organisation_id != current_teacher.organisation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create lessons in your organisation"
        )

    lesson = Lesson(
        date=lesson_data.date,
        time=lesson_data.time,
        location=lesson_data.location,
        price=lesson_data.price,
        organisation_id=current_teacher.organisation_id,
        teachers=[current_teacher]
    )

    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all() #frontend only returns stud ids. backend is expecting an object. this query returns the user object for each student

    for student in students:
        if student.organisation_id != current_teacher.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )
        
        if student.role != 'student':
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

    lesson.students = students

    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson

# ✅ TEACHER: Get all lessons taught by the current teacher
@router.get("/my-lessons", response_model=List[LessonRead])
def get_my_lessons(
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    return db.query(Lesson).filter(Lesson.teachers.any(id=current_teacher.id)).all()

# ✅ TEACHER: Update a lesson they are teaching
@router.put("/{lesson_id}", response_model=LessonRead) #lesson ID comes from the url while lesson_data is populated by the schema
def update_lesson(
    lesson_id: int,
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_teacher not in lesson.teachers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update lessons you are teaching"
        )

    # Update fields
    lesson.date = lesson_data.date
    lesson.time = lesson_data.time
    lesson.location = lesson_data.location
    lesson.price = lesson_data.price

    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all()

    for student in students:
        if student.organisation_id != current_teacher.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )
        if student.role != 'student':
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

    lesson.students = students
    db.commit()
    db.refresh(lesson)
    return lesson


# ✅ TEACHER: Delete a lesson they are teaching
@router.delete("/{lesson_id}/own", status_code=status.HTTP_204_NO_CONTENT)
def delete_own_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_teacher),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_teacher not in lesson.teachers:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete lessons you are teaching"
        )

    db.delete(lesson)
    db.commit()


# ✅ ADMIN: Get all lessons in organisation
@router.get("/", response_model=List[LessonRead])
def get_lessons_by_organisation(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return db.query(Lesson).filter(Lesson.organisation_id == current_admin.organisation_id).all()


# ✅ ADMIN: Get a specific lesson
@router.get("/{lesson_id}", response_model=LessonRead)
def get_lesson_by_id(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or lesson.organisation_id != current_admin.organisation_id:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


# ✅ ADMIN: Delete any lesson in their organisation
@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_any_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson or lesson.organisation_id != current_admin.organisation_id:
        raise HTTPException(status_code=404, detail="Lesson not found")

    db.delete(lesson)
    db.commit()

# api/routes/lessons.py

@router.post("/admin", response_model=LessonRead)
def admin_create_lesson(
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):

    # if lesson_data.organisation_id != current_admin.organisation_id:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="You can only create lessons in your organisation"
    #     )

    # Fetch and validate teacher objects
    teachers = db.query(User).filter(User.id.in_(lesson_data.teacher_ids)).all()

    for teacher in teachers:
        if teacher.organisation_id != current_admin.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )
        
        if teacher.role != 'teacher':
            raise HTTPException(
                status_code=400,
                detail="All teachers must have role of teacher"
            )

    # Fetch and validate student objects
    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all()

    for student in students:
        if student.organisation_id != current_admin.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )
        
        if student.role != 'student':
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

    lesson = Lesson(
        date=lesson_data.date,
        time=lesson_data.time,
        location=lesson_data.location,
        price=lesson_data.price,
        organisation_id=current_admin.organisation_id,
        teachers=teachers,
        students=students,
    )

    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson
