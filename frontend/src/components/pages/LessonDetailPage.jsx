import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

const parseApiTime = (timeStr) => {
  if (!timeStr) return { h: 0, m: 0 };
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return {
    h: Number.isFinite(h) ? h : 0,
    m: Number.isFinite(m) ? m : 0,
  };
};

const formatTime = (timeStr) => {
  const { h, m } = parseApiTime(timeStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${pad2(m)} ${ampm}`;
};

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

const formatDuration = (duration) => {
  const n = Number(duration);
  if (!Number.isFinite(n)) return '';

  // backend stores minutes
  if (n >= 10) {
    const hours = n / 60;
    return `${hours % 1 === 0 ? hours.toFixed(0) : hours}h`;
  }

  // fallback if backend sends hours directly
  return `${n % 1 === 0 ? n.toFixed(0) : n}h`;
};

const statusBadgeClass = (value, kind = 'attendance') => {
  const v = String(value || '').toLowerCase();

  if (kind === 'payment') {
    if (v === 'paid') return 'bg-green-100 text-green-800 border border-green-200';
    if (v === 'unpaid') return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }

  if (v === 'attended') return 'bg-green-100 text-green-800 border border-green-200';
  if (v === 'assigned') return 'bg-blue-100 text-blue-800 border border-blue-200';
  if (v === 'missed') return 'bg-red-100 text-red-800 border border-red-200';
  if (v === 'cancelled') return 'bg-gray-100 text-gray-700 border border-gray-200';
  return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
};

const formatAttendanceLabel = (status) => {
  const v = String(status || '').toLowerCase();
  if (v === 'attended') return 'Attended';
  if (v === 'missed') return 'Missed';
  if (v === 'cancelled') return 'Cancelled';
  if (v === 'assigned') return 'Assigned';
  return 'Pending';
};

const formatPaymentLabel = (status) => {
  const v = String(status || '').toLowerCase();
  if (v === 'paid') return 'Paid';
  if (v === 'unpaid') return 'Unpaid';
  return v || 'Unknown';
};

const ATTENDANCE_OPTIONS = ['assigned', 'attended', 'missed', 'cancelled'];
const PAYMENT_OPTIONS = ['unpaid', 'paid'];

const LessonDetailPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || '/calendar';
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [lesson, setLesson] = useState(null);
  const [role, setRole] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLesson, setLoadingLesson] = useState(true);
  const [error, setError] = useState('');
  const [savingMap, setSavingMap] = useState({});

  useEffect(() => {
    const fetchMe = async () => {
      setLoadingUser(true);
      setError('');

      try {
        if (!token) {
          setError('No authentication token found. Please log in.');
          return;
        }

        const res = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || 'Failed to load user info');
          return;
        }

        const data = await res.json();
        setRole((data?.role || '').toLowerCase());
      } catch {
        setError('Network error occurred while loading user info');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchMe();
  }, [token]);

  useEffect(() => {
    const fetchLesson = async () => {
      setLoadingLesson(true);

      try {
        if (!token) return;

        const res = await fetch(`/api/lessons/${lessonId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || `Failed to load lesson (${res.status})`);
          setLesson(null);
          return;
        }

        const data = await res.json();
        setLesson(data);
      } catch {
        setError('Network error occurred while loading lesson');
        setLesson(null);
      } finally {
        setLoadingLesson(false);
      }
    };

    fetchLesson();
  }, [lessonId, token]);

  const setRowSaving = (studentId, field, value) => {
    const key = `${studentId}-${field}`;
    setSavingMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleStatusChange = async (studentId, field, value) => {
    const previousLesson = lesson;

    try {
      setRowSaving(studentId, field, true);
      setError('');

      setLesson((prev) => ({
        ...prev,
        student_links: Array.isArray(prev?.student_links)
          ? prev.student_links.map((link) => {
              const matches =
                link.student_id === studentId || link.student?.id === studentId;

              if (!matches) return link;

              return {
                ...link,
                [field]: value,
              };
            })
          : [],
      }));

      const res = await fetch(`/api/lessons/${lessonId}/students/${studentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [field]: value }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Failed to update ${field}`);
      }

      let updatedLink = null;
      try {
        updatedLink = await res.json();
      } catch {
        updatedLink = null;
      }

      if (updatedLink) {
        setLesson((prev) => ({
          ...prev,
          student_links: Array.isArray(prev?.student_links)
            ? prev.student_links.map((link) => {
                const matches =
                  link.student_id === studentId || link.student?.id === studentId;

                if (!matches) return link;

                return {
                  ...link,
                  ...updatedLink,
                  [field]: value,
                };
              })
            : [],
        }));
      }
    } catch (err) {
      setLesson(previousLesson);
      setError(err?.message || 'Failed to update lesson status');
    } finally {
      setRowSaving(studentId, field, false);
    }
  };

  if (loadingUser || loadingLesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Lesson Details" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="py-12 text-center text-gray-600">Loading lesson...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !lesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Lesson Details" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Lesson Details" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ← Back
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="py-12 text-center text-gray-600">Lesson not found.</div>
          </div>
        </div>
      </div>
    );
  }

  const studentLinks = Array.isArray(lesson.student_links) ? lesson.student_links : [];
  const teachers = Array.isArray(lesson.teachers) ? lesson.teachers : [];
  const isTeacher = role === 'teacher';
  const isAdmin = role === 'admin';
  const durationText = formatDuration(lesson.duration);

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Lesson Details" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ← Back
            </button>

            {(isTeacher || isAdmin) && (
              <button
                type="button"
                onClick={() =>
                  navigate(`/lessons/${lessonId}/edit`, {
                    state: { from: location.pathname },
                  })
                }
                className="px-3 py-2 rounded-lg border border-gray-900 bg-gray-900 text-white text-sm hover:bg-black"
              >
                Edit lesson
              </button>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {lesson.date} · {formatTime(lesson.time)}
              </h1>
              <p className="mt-1 text-gray-600">{lesson.location || 'Unknown location'}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {lesson.subject && (
                  <span className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-sm text-gray-700">
                    {lesson.subject}
                  </span>
                )}
                {durationText && (
                  <span className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-sm text-gray-700">
                    {durationText}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-[240px]">
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Price (per hour)</div>
                <div className="text-xl font-semibold text-gray-900">
                  {money(lesson.price)}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-500">Organisation ID</div>
                <div className="text-xl font-semibold text-gray-900">
                  {lesson.organisation_id ?? '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-medium text-gray-900">Teachers</h2>
              <div className="mt-3 space-y-2">
                {teachers.length > 0 ? (
                  teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-800"
                    >
                      {teacher.name || `Teacher #${teacher.id}`}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">No teachers assigned.</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-medium text-gray-900">Lesson Summary</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div>
                  <span className="text-gray-500">Date:</span> {lesson.date || '-'}
                </div>
                <div>
                  <span className="text-gray-500">Time:</span> {formatTime(lesson.time)}
                </div>
                <div>
                  <span className="text-gray-500">Location:</span> {lesson.location || '-'}
                </div>
                <div>
                  <span className="text-gray-500">Subject:</span> {lesson.subject || '-'}
                </div>
                <div>
                  <span className="text-gray-500">Duration:</span> {durationText || '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-gray-900">Students</h2>
              <div className="text-sm text-gray-500">
                {studentLinks.length} student{studentLinks.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {studentLinks.length > 0 ? (
                studentLinks.map((link, index) => {
                  const student = link?.student;
                  const studentId = student?.id ?? link?.student_id ?? index;
                  const attendance = link?.attendance_status || 'assigned';
                  const payment = link?.payment_status || 'unpaid';

                  const savingAttendance = !!savingMap[`${studentId}-attendance_status`];
                  const savingPayment = !!savingMap[`${studentId}-payment_status`];

                  return (
                    <div
                      key={studentId}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {student?.name || `Student #${studentId}`}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                attendance,
                                'attendance'
                              )}`}
                            >
                              {formatAttendanceLabel(attendance)}
                            </span>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                                payment,
                                'payment'
                              )}`}
                            >
                              {formatPaymentLabel(payment)}
                            </span>
                          </div>
                        </div>

                        {isTeacher || isAdmin ? (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                Attendance
                              </label>
                              <select
                                value={attendance}
                                disabled={savingAttendance}
                                onChange={(e) =>
                                  handleStatusChange(
                                    studentId,
                                    'attendance_status',
                                    e.target.value
                                  )
                                }
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
                              >
                                {ATTENDANCE_OPTIONS.map((option) => (
                                  <option key={option} value={option}>
                                    {formatAttendanceLabel(option)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {isAdmin && (
  <div>
    <label className="block text-xs text-gray-500 mb-1">
      Payment
    </label>
    <select
      value={payment}
      disabled={savingPayment}
      onChange={(e) =>
        handleStatusChange(
          studentId,
          'payment_status',
          e.target.value
        )
      }
      className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white"
    >
      {PAYMENT_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {formatPaymentLabel(option)}
        </option>
      ))}
    </select>
  </div>
)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">No students assigned.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonDetailPage;