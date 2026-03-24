import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

const parseApiTime = (timeStr) => {
  if (!timeStr) return { h: 0, m: 0 };
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return { h: Number.isFinite(h) ? h : 0, m: Number.isFinite(m) ? m : 0 };
};

const formatTime = (timeStr) => {
  const { h, m } = parseApiTime(timeStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${pad2(m)} ${ampm}`;
};

const money = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

const statusBadgeClass = (value, kind = 'default') => {
  const v = (value || '').toLowerCase();

  if (kind === 'payment') {
    if (v === 'paid') return 'bg-green-100 text-green-800';
    if (v === 'unpaid') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  }

  if (v === 'attended') return 'bg-green-100 text-green-800';
  if (v === 'assigned') return 'bg-blue-100 text-blue-800';
  if (v === 'missed') return 'bg-red-100 text-red-800';
  if (v === 'cancelled') return 'bg-gray-100 text-gray-700';
  return 'bg-gray-100 text-gray-700';
};

const ATTENDANCE_OPTIONS = ['assigned', 'attended', 'missed', 'cancelled'];
const PAYMENT_OPTIONS = ['unpaid', 'paid'];

const LessonDetailPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [lesson, setLesson] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingMap, setSavingMap] = useState({});

  useEffect(() => {
    const fetchMe = async () => {
      try {
        if (!token) {
          setError('No authentication token found. Please log in.');
          return;
        }

        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
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
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  useEffect(() => {
    const fetchLesson = async () => {
      setLessonLoading(true);

      try {
        if (!token) return;

        const res = await fetch(`/api/lessons/${lessonId}`, {
          headers: { Authorization: `Bearer ${token}` },
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
        setLessonLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId, token]);

  if (loading || lessonLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Lesson Details" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => navigate('/calendar')}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ← Back to Calendar
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
              onClick={() => navigate('/calendar')}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
            >
              ← Back to Calendar
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
  const setRowSaving = (studentId, field, value) => {
  const key = `${studentId}-${field}`;
  setSavingMap((prev) => ({ ...prev, [key]: value }));
};

const handleStatusChange = async (studentId, field, value) => {
try {
    setRowSaving(studentId, field, true);
    setError('');

    const res = await fetch(`/api/lessons/${lesson.id}/students/${studentId}`, {
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

    const updatedLink = await res.json();

    setLesson((prev) => ({
    ...prev,
    student_links: Array.isArray(prev?.student_links)
        ? prev.student_links.map((link) =>
            link.student_id === studentId ? { ...link, ...updatedLink } : link
        )
        : [],
    }));
} catch (err) {
    setError(err?.message || 'Failed to update lesson status');
} finally {
    setRowSaving(studentId, field, false);
}
};

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Lesson Details" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate('/calendar')}
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm hover:bg-gray-50"
          >
            ← Back to Calendar
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {lesson.date} · {formatTime(lesson.time)}
              </h1>
              <p className="mt-1 text-gray-600">{lesson.location || 'Unknown location'}</p>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">Price</div>
              <div className="text-xl font-semibold text-gray-900">{money(lesson.price)}</div>
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
              <h2 className="text-sm font-medium text-gray-900">Summary</h2>
              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Lesson ID:</span> {lesson.id}
                </div>
                <div>
                  <span className="font-medium">Organisation ID:</span> {lesson.organisation_id}
                </div>
                <div>
                  <span className="font-medium">Subject:</span> {lesson.subject}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {lesson.duration}
                </div>
                <div>
                  <span className="font-medium">Students:</span> {studentLinks.length}
                </div>
                
              </div>
            </div>
          </div>

          {isTeacher && (
  <div className="mt-6 rounded-lg border border-gray-200 p-4">
    <h2 className="text-sm font-medium text-gray-900">Students</h2>

    <div className="mt-4 overflow-x-auto">
      {studentLinks.length > 0 ? (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="py-2 pr-4 font-medium">Student</th>
              <th className="py-2 pr-4 font-medium">Attendance</th>
              <th className="py-2 pr-4 font-medium">Payment</th>
            </tr>
          </thead>
          <tbody>
            {studentLinks.map((link) => {
              const student = link?.student;
              const attendanceSaving = !!savingMap[`${link.student_id}-attendance_status`];
              const paymentSaving = !!savingMap[`${link.student_id}-payment_status`];

              return (
                <tr
                  key={`${link.lesson_id}-${link.student_id}`}
                  className="border-b border-gray-100"
                >
                  <td className="py-3 pr-4 text-gray-900">
                    {student?.name || `Student #${student?.id ?? ''}`}
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={link.attendance_status || 'assigned'}
                        onChange={(e) =>
                          handleStatusChange(link.student_id, 'attendance_status', e.target.value)
                        }
                        disabled={attendanceSaving}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
                      >
                        {ATTENDANCE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {attendanceSaving && (
                        <span className="text-xs text-gray-500">Saving...</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={link.payment_status || 'unpaid'}
                        onChange={(e) =>
                          handleStatusChange(link.student_id, 'payment_status', e.target.value)
                        }
                        disabled={paymentSaving}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm bg-white"
                      >
                        {PAYMENT_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {paymentSaving && (
                        <span className="text-xs text-gray-500">Saving...</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="text-sm text-gray-500">No students assigned.</div>
      )}
    </div>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default LessonDetailPage;