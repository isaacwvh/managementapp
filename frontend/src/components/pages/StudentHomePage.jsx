import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

const parseApiDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const parseApiTime = (timeStr) => {
  if (!timeStr) return { h: 0, m: 0 };
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return {
    h: Number.isFinite(h) ? h : 0,
    m: Number.isFinite(m) ? m : 0,
  };
};

const lessonDateTime = (lesson) => {
  const d = parseApiDate(lesson?.date);
  const t = parseApiTime(lesson?.time);
  if (!d) return new Date(0);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    t.h,
    t.m,
    0,
    0
  );
};

const formatTime = (timeStr) => {
  const { h, m } = parseApiTime(timeStr);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr12 = h % 12 === 0 ? 12 : h % 12;
  return `${hr12}:${pad2(m)} ${ampm}`;
};

const formatDate = (dateStr) => {
  const d = parseApiDate(dateStr);
  if (!d) return dateStr || '';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${(n / 100).toFixed(2)}`;
};

const formatDuration = (duration) => {
  const n = Number(duration);
  if (!Number.isFinite(n)) return '';

  if (n >= 10) {
    const hours = n / 60;
    return `${hours % 1 === 0 ? hours.toFixed(0) : hours}h`;
  }

  return `${n % 1 === 0 ? n.toFixed(0) : n}h`;
};

const normalizeStatus = (raw) => {
  return String(raw || '').trim().toLowerCase();
};

const getCurrentStudentLink = (lesson, currentUserId) => {
  if (!Array.isArray(lesson?.student_links)) return null;

  return (
    lesson.student_links.find(
      (link) =>
        String(link?.student_id) === String(currentUserId) ||
        String(link?.student?.id) === String(currentUserId)
    ) || null
  );
};

const getStudentLessonStatus = (lesson, currentUserId) => {
  const link = getCurrentStudentLink(lesson, currentUserId);
  return normalizeStatus(
    link?.attendance_status ??
      link?.attendance ??
      link?.status ??
      'assigned'
  );
};

const getStudentPaidStatus = (lesson, currentUserId) => {
  const link = getCurrentStudentLink(lesson, currentUserId);

  const value =
    link?.is_paid ??
    link?.paid ??
    link?.payment_status;

  if (typeof value === 'boolean') return value;

  const normalized = String(value ?? '').trim().toLowerCase();
  return (
    normalized === 'paid' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === '1'
  );
};

const statusBadgeClass = (status) => {
  if (status === 'attended') {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  if (status === 'missed') {
    return 'bg-red-100 text-red-800 border border-red-200';
  }
  if (status === 'cancelled') {
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
  if (status === 'assigned') {
    return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  }
  return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
};

const formatAttendanceLabel = (status) => {
  if (status === 'attended') return 'Attended';
  if (status === 'missed') return 'Missed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'assigned') return 'Assigned';
  return 'Assigned';
};

const LessonPreviewCard = ({ lesson, navigate, currentUserId }) => {
  const status = getStudentLessonStatus(lesson, currentUserId);
  const isPaid = getStudentPaidStatus(lesson, currentUserId);

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/lessons/${lesson.id}`, {
          state: { from: '/student-home' },
        })
      }
      className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-gray-900">
              {formatDate(lesson.date)}
            </span>
            <span className="text-sm text-gray-700">{formatTime(lesson.time)}</span>
            <span className="text-sm text-gray-500">·</span>
            <span className="text-sm text-gray-700">{lesson.subject || 'No subject'}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span>{lesson.location || 'Unknown location'}</span>
            <span>·</span>
            <span>{formatDuration(lesson.duration) || 'No duration'}</span>
            <span>·</span>
            <span>{formatPrice(lesson.price)}</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${statusBadgeClass(
                status
              )}`}
            >
              {formatAttendanceLabel(status)}
            </span>

            <span
              className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${
                isPaid
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-orange-100 text-orange-800 border border-orange-200'
              }`}
            >
              {isPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
          View details →
        </div>
      </div>
    </button>
  );
};

export const StudentHomePage = () => {
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [userInfo, setUserInfo] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoadingUser(true);
      setError('');

      try {
        if (!token) {
          setError('No authentication token found. Please log in.');
          return;
        }

        const response = await fetch('/api/users/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUserInfo(userData);
        } else {
          const errorText = await response.text();
          if (response.status === 401) {
            localStorage.removeItem('token');
            setError('Authentication failed. Please log in again.');
          } else {
            setError(`Failed to fetch user information: ${errorText}`);
          }
        }
      } catch {
        setError('Network error occurred while loading user info');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserInfo();
  }, [token]);

  useEffect(() => {
    const fetchLessons = async () => {
      setLoadingLessons(true);

      try {
        if (!token) return;
        if ((userInfo?.role || '').toLowerCase() !== 'student') {
          setLessons([]);
          return;
        }

        const response = await fetch('/api/lessons/my-lessons-student', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          setError(`Failed to fetch lessons: ${errorText}`);
          setLessons([]);
          return;
        }

        const data = await response.json();
        const normalized = Array.isArray(data) ? data : [];
        normalized.sort((a, b) => lessonDateTime(a) - lessonDateTime(b));
        setLessons(normalized);
      } catch {
        setError('Network error occurred while loading lessons');
        setLessons([]);
      } finally {
        setLoadingLessons(false);
      }
    };

    if (userInfo) {
      fetchLessons();
    }
  }, [token, userInfo]);

  const role = useMemo(() => (userInfo?.role || '').toLowerCase(), [userInfo]);
  const isStudent = role === 'student';

  const upcomingLessons = useMemo(() => {
    const now = new Date();

    return lessons
      .filter((lesson) => lessonDateTime(lesson) > now)
      .sort((a, b) => lessonDateTime(a) - lessonDateTime(b))
      .slice(0, 6);
  }, [lessons]);

  const notifications = useMemo(() => {
    const now = new Date();

    return lessons
      .filter((lesson) => {
        const isPast = lessonDateTime(lesson) <= now;
        const isPaid = getStudentPaidStatus(lesson, userInfo?.id);
        return isPast && !isPaid;
      })
      .sort((a, b) => lessonDateTime(b) - lessonDateTime(a));
  }, [lessons, userInfo?.id]);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Dashboard" />
        <div className="max-w-6xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center py-16 text-gray-600">
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isStudent) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Dashboard" />
        <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-light text-gray-900">Welcome</h1>
                <p className="mt-2 text-gray-600">
                  This home page is only available to students.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Dashboard" />

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">
                Welcome{userInfo?.name ? `, ${userInfo.name}` : ''}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Here’s your student dashboard and anything that needs attention.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                {role || 'unknown'}
              </span>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  userInfo?.is_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {userInfo?.is_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Name</div>
              <div className="mt-1 text-lg text-gray-900">{userInfo?.name || '-'}</div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Email</div>
              <div className="mt-1 text-lg text-gray-900 break-all">
                {userInfo?.email || '-'}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <div className="text-sm text-gray-500">Organisation</div>
              <div className="mt-1 text-lg text-gray-900">
                {userInfo?.organisation_id ? `#${userInfo.organisation_id}` : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <section className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-light text-gray-900">Upcoming Lessons</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Your next scheduled lessons
                </p>
              </div>

              <button
                onClick={() => navigate('/student/manage-lessons')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                View all
              </button>
            </div>

            {loadingLessons ? (
              <div className="text-sm text-gray-500">Loading lessons...</div>
            ) : upcomingLessons.length === 0 ? (
              <div className="text-sm text-gray-500">No upcoming lessons.</div>
            ) : (
              <div className="space-y-3">
                {upcomingLessons.map((lesson) => (
                  <LessonPreviewCard
                    key={lesson.id}
                    lesson={lesson}
                    navigate={navigate}
                    currentUserId={userInfo?.id}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-light text-gray-900">Notifications</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Past lessons that are still unpaid
                </p>
              </div>

              <div className="text-sm text-gray-500">
                {notifications.length} item{notifications.length === 1 ? '' : 's'}
              </div>
            </div>

            {loadingLessons ? (
              <div className="text-sm text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="text-sm text-gray-500">No notifications right now.</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((lesson) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() =>
                      navigate(`/lessons/${lesson.id}`, {
                        state: { from: '/student-home' },
                      })
                    }
                    className="w-full text-left rounded-xl border border-orange-200 bg-orange-50 p-4 hover:bg-orange-100 transition"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-sm font-semibold text-gray-900">
                          {formatDate(lesson.date)}
                        </span>
                        <span className="text-sm text-gray-700">
                          {formatTime(lesson.time)}
                        </span>
                        <span className="text-sm text-gray-500">·</span>
                        <span className="text-sm text-gray-700">
                          {lesson.subject || 'No subject'}
                        </span>
                      </div>

                      <div className="text-sm text-orange-900">
                        This past lesson is still unpaid.
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                        <span>{lesson.location || 'Unknown location'}</span>
                        <span>·</span>
                        <span>{formatDuration(lesson.duration) || 'No duration'}</span>
                        <span>·</span>
                        <span>{formatPrice(lesson.price)}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default StudentHomePage;