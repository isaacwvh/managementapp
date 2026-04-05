from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.lesson import Lesson
from app.models.associations import LessonStudent
from app.models.user import User
from app.schemas.lesson import LessonCreate, LessonRead, LessonStudentRead, LessonStudentUpdate
from app.utils import get_current_user, get_current_teacher, get_current_admin

router = APIRouter(tags=["Lessons"])

#FOR STUDENTS: GET UPCOMING LESSONS
@router.get("/my-lessons-student", response_model=list[LessonRead])
def get_my_lessons_as_student(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    lessons = (
        db.query(Lesson)
        .join(LessonStudent, LessonStudent.lesson_id == Lesson.id)
        .filter(LessonStudent.student_id == current_user.id)
        .order_by(Lesson.date, Lesson.time)
        .all()
    )

    return lessons


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
        subject=lesson_data.subject,
        duration=int(lesson_data.duration*60),
        location=lesson_data.location,
        price=lesson_data.price,
        organisation_id=current_teacher.organisation_id,
        teachers=[current_teacher]
    )

    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all()

    if len(students) != len(set(lesson_data.student_ids)):
        raise HTTPException(
            status_code=400,
            detail="One or more student IDs are invalid"
        )

    for student in students:
        if student.organisation_id != current_teacher.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )

        if student.role != "student":
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

        lesson.student_links.append(
            LessonStudent(
                student=student,
                attendance_status="assigned",
                payment_status="unpaid"
            )
        )

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
@router.put("/{lesson_id}", response_model=LessonRead)
def update_lesson(
    lesson_id: int,
    lesson_data: LessonCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # if current_teacher not in lesson.teachers:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="You can only update lessons you are teaching"
    #     )
    if current_user.role == 'student':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot edit lessons"
        )

    if lesson_data.organisation_id != current_user.organisation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update lessons in your organisation"
        )

    # Update simple lesson fields
    lesson.date = lesson_data.date
    lesson.time = lesson_data.time
    lesson.subject = lesson_data.subject
    lesson.duration = round(lesson_data.duration * 60)
    lesson.location = lesson_data.location
    lesson.price = lesson_data.price
    lesson.organisation_id = current_user.organisation_id

    # Fetch teachers
    teachers = db.query(User).filter(User.id.in_(lesson_data.teacher_ids)).all()

    if len(teachers) != len(set(lesson_data.teacher_ids)):
        raise HTTPException(
            status_code=400,
            detail="One or more teacher IDs are invalid"
        )

    for teacher in teachers:
        if teacher.organisation_id != current_user.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All teachers must belong to your organisation"
            )

        if teacher.role != "teacher":
            raise HTTPException(
                status_code=400,
                detail="All selected teachers must have role of teacher"
            )

    # Update lesson teachers
    lesson.teachers = teachers

    # Fetch students
    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all()

    if len(students) != len(set(lesson_data.student_ids)):
        raise HTTPException(
            status_code=400,
            detail="One or more student IDs are invalid"
        )

    for student in students:
        if student.organisation_id != current_user.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )

        if student.role != "student":
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

    # Preserve existing student statuses where possible
    existing_links = {link.student_id: link for link in lesson.student_links}

    # Clear old student links
    lesson.student_links.clear()

    # Rebuild student links
    for student in students:
        old_link = existing_links.get(student.id)

        lesson.student_links.append(
            LessonStudent(
                student=student,
                attendance_status=old_link.attendance_status if old_link else "assigned",
                payment_status=old_link.payment_status if old_link else "unpaid"
            )
        )

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

#ALL: get specific lesson
@router.get("/{lesson_id}", response_model=LessonRead)
def get_lesson(
    lesson_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()

    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    if current_user.organisation_id != lesson.organisation_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this lesson")

    if current_user.role == "teacher":
        teacher_ids = [teacher.id for teacher in lesson.teachers]
        if current_user.id not in teacher_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this lesson")

    if current_user.role == "student":
        student_ids = [link.student_id for link in lesson.student_links]
        if current_user.id not in student_ids:
            raise HTTPException(status_code=403, detail="Not authorized to view this lesson")

    return lesson

#teacher: update student status per lesson
@router.patch("/{lesson_id}/students/{student_id}", response_model=LessonStudentRead)
def update_lesson_student_status(
    lesson_id: int,
    student_id: int,
    update_data: LessonStudentUpdate,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(get_current_admin),
):
    if current_teacher.role == 'student':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Students cannot edit lesson student status"
        )
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()

    if not lesson:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found"
        )

    if lesson.organisation_id != current_teacher.organisation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this lesson"
        )

    # teacher_ids = [teacher.id for teacher in lesson.teachers]
    # if current_teacher.id not in teacher_ids:
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only teachers assigned to this lesson can update statuses"
    #     )

    lesson_student = (
        db.query(LessonStudent)
        .filter(
            LessonStudent.lesson_id == lesson_id,
            LessonStudent.student_id == student_id
        )
        .first()
    )

    if not lesson_student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student is not assigned to this lesson"
        )

    if update_data.attendance_status is not None:
        lesson_student.attendance_status = update_data.attendance_status

    if update_data.payment_status is not None:
        lesson_student.payment_status = update_data.payment_status

    db.commit()
    db.refresh(lesson_student)
    return lesson_student


# ✅ ADMIN: Get all lessons in organisation
@router.get("/", response_model=List[LessonRead])
def get_lessons_by_organisation(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    return db.query(Lesson).filter(Lesson.organisation_id == current_admin.organisation_id).all()


# ✅ ADMIN: Get a specific lesson
# @router.get("/admin/{lesson_id}", response_model=LessonRead)
# def get_lesson_by_id(
#     lesson_id: int,
#     db: Session = Depends(get_db),
#     current_admin: User = Depends(get_current_admin),
# ):
#     lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
#     if not lesson or lesson.organisation_id != current_admin.organisation_id:
#         raise HTTPException(status_code=404, detail="Lesson not found")
#     return lesson


# ✅ ADMIN: Delete any lesson in their organisation
@router.delete("/admin/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
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
    teachers = db.query(User).filter(User.id.in_(lesson_data.teacher_ids)).all()

    if len(teachers) != len(set(lesson_data.teacher_ids)):
        raise HTTPException(
            status_code=400,
            detail="One or more teacher IDs are invalid"
        )

    for teacher in teachers:
        if teacher.organisation_id != current_admin.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All teachers must belong to your organisation"
            )

        if teacher.role != "teacher":
            raise HTTPException(
                status_code=400,
                detail="All teachers must have role of teacher"
            )

    students = db.query(User).filter(User.id.in_(lesson_data.student_ids)).all()

    if len(students) != len(set(lesson_data.student_ids)):
        raise HTTPException(
            status_code=400,
            detail="One or more student IDs are invalid"
        )

    for student in students:
        if student.organisation_id != current_admin.organisation_id:
            raise HTTPException(
                status_code=400,
                detail="All students must belong to your organisation"
            )

        if student.role != "student":
            raise HTTPException(
                status_code=400,
                detail="All students must have role of student"
            )

    lesson = Lesson(
        date=lesson_data.date,
        time=lesson_data.time,
        subject=lesson_data.subject,
        duration=int(lesson_data.duration * 60),
        location=lesson_data.location,
        price=lesson_data.price,
        organisation_id=current_admin.organisation_id,
        teachers=teachers,
    )

    for student in students:
        lesson.student_links.append(
            LessonStudent(
                student=student,
                attendance_status="assigned",
                payment_status="unpaid"
            )
        )

    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson

#admin: get all lessons for a specific student:
@router.get("/admin/students/{student_id}/lessons", response_model=list[LessonRead])
def get_lessons_for_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    student = db.query(User).filter(
        User.id == student_id,
        User.organisation_id == current_admin.organisation_id
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if student.role != "student":
        raise HTTPException(status_code=400, detail="User is not a student")

    lessons = (
        db.query(Lesson)
        .join(LessonStudent, LessonStudent.lesson_id == Lesson.id)
        .filter(LessonStudent.student_id == student_id)
        .order_by(Lesson.date, Lesson.time)
        .all()
    )

    return lessons

#admin: get all lessons for a specific teacher
@router.get("/admin/teachers/{teacher_id}/lessons", response_model=List[LessonRead])
def get_lessons_for_teacher(
    teacher_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    teacher = db.query(User).filter(
        User.id == teacher_id,
        User.role == "teacher",
        User.organisation_id == current_admin.organisation_id
    ).first()

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    return (
        db.query(Lesson)
        .filter(Lesson.teachers.any(id=teacher_id))
        .order_by(Lesson.date, Lesson.time)
        .all()
    )

