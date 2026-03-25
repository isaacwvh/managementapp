import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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

const formatMonthYear = (dateStr) => {
  const d = parseApiDate(dateStr);
  if (!d) return 'Unknown Month';
  return d.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
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

const formatPrice = (price) => {
  const n = Number(price);
  if (!Number.isFinite(n)) return '$0.00';
  return `$${(n / 100).toFixed(2)}`;
};

const normalizeStatus = (raw) => {
  return String(raw || '').trim().toLowerCase();
};

const statusLabel = (status) => {
  if (status === 'assigned') return 'Assigned';
  if (status === 'attended') return 'Attended';
  if (status === 'missed') return 'Missed';
  if (status === 'cancelled') return 'Cancelled';
  return 'Pending';
};

const statusStyles = (status) => {
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
    return 'bg-blue-100 text-blue-800 border border-blue-200';
  }
  return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
};

const paidStyles = (paid) => {
  return paid
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-orange-100 text-orange-800 border border-orange-200';
};

const isTruthyPaid = (value) => {
  if (value === true) return true;
  if (value === false) return false;

  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  return normalized === 'paid' || normalized === 'true' || normalized === 'yes' || normalized === '1';
};

const getStudentLink = (lesson, studentId) => {
  if (!Array.isArray(lesson?.student_links)) return null;

  return (
    lesson.student_links.find(
      (link) =>
        String(link?.student_id) === String(studentId) ||
        String(link?.student?.id) === String(studentId)
    ) || null
  );
};

const getStudentLessonStatus = (lesson, studentId) => {
  const link = getStudentLink(lesson, studentId);
  return normalizeStatus(
    link?.attendance ??
      link?.attendance_status ??
      link?.status
  );
};

const getStudentPaidStatus = (lesson, studentId) => {
  const link = getStudentLink(lesson, studentId);

  return isTruthyPaid(
    link?.is_paid ??
      link?.paid ??
      link?.payment_status
  );
};

const isPastLesson = (lesson) => lessonDateTime(lesson) < new Date();

const isSameMonthAsNow = (lesson) => {
  const d = lessonDateTime(lesson);
  const now = new Date();

  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
};

const shouldShowOverdueWarning = (lesson, studentId) => {
  const past = isPastLesson(lesson);
  const paid = getStudentPaidStatus(lesson, studentId);
  const sameMonth = isSameMonthAsNow(lesson);

  return past && !paid && !sameMonth;
};

const LessonRow = ({ lesson, navigate, studentId }) => {
  const subject = lesson?.subject || 'No subject';
  const location = lesson?.location || 'Unknown location';
  const duration = formatDuration(lesson?.duration);
  const status = getStudentLessonStatus(lesson, studentId);
  const isPaid = getStudentPaidStatus(lesson, studentId);
  const overdueWarning = shouldShowOverdueWarning(lesson, studentId);

  return (
    <button
      type="button"
      onClick={() =>
        navigate(`/lessons/${lesson.id}`, {
          state: { from: `/admin/students/${studentId}` },
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
            <span className="text-sm text-gray-700">
              {formatTime(lesson.time)}
            </span>
            <span className="text-sm text-gray-500">·</span>
            <span className="text-sm text-gray-700">{subject}</span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
            <span>{location}</span>
            <span>·</span>
            <span>{duration || 'No duration'}</span>
            <span>·</span>
            <span>{formatPrice(lesson.price)}</span>
          </div>

          {overdueWarning && (
            <div className="mt-2 inline-flex items-center rounded-lg bg-red-50 border border-red-200 px-3 py-1 text-xs font-medium text-red-800">
              Warning: this past lesson is still unpaid from a previous month
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${statusStyles(status)}`}
            >
              {statusLabel(status)}
            </span>

            <span
              className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${paidStyles(isPaid)}`}
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

const AdminManageStudentPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('');
  const [student, setStudent] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentLoading, setStudentLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const token = useMemo(() => localStorage.getItem('token'), []);
  const backPath = location.state?.from || '/admin/students';

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      setError('');

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
        setUserInfo(data);
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
    const fetchStudent = async () => {
      setStudentLoading(true);

      try {
        if (!token || !role || role !== 'admin' || !studentId) return;

        const res = await fetch(`/api/users/${studentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || `Failed to load student (${res.status})`);
          setStudent(null);
          return;
        }

        const data = await res.json();
        setStudent(data);
      } catch {
        setError('Network error occurred while loading student info');
        setStudent(null);
      } finally {
        setStudentLoading(false);
      }
    };

    fetchStudent();
  }, [role, token, studentId]);

  useEffect(() => {
    const fetchLessons = async () => {
      setLessonsLoading(true);

      try {
        if (!token || !role || role !== 'admin' || !studentId) return;

        const res = await fetch(`/api/lessons/admin/students/${studentId}/lessons`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || `Failed to load lessons (${res.status})`);
          setLessons([]);
          return;
        }

        const data = await res.json();
        setLessons(Array.isArray(data) ? data : []);
      } catch {
        setError('Network error occurred while loading lessons');
        setLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };

    fetchLessons();
  }, [role, token, studentId]);

  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    const locationQ = locationFilter.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const status = getStudentLessonStatus(lesson, studentId);
      const isPaid = getStudentPaidStatus(lesson, studentId);

      const haystack = [
        lesson?.subject || '',
        lesson?.location || '',
        lesson?.date || '',
        lesson?.time || '',
        status,
        isPaid ? 'paid' : 'unpaid',
      ]
        .join(' ')
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (
        locationQ &&
        !(lesson?.location || '').toLowerCase().includes(locationQ)
      ) {
        return false;
      }

      if (dateFilter && lesson?.date !== dateFilter) return false;
      if (paymentFilter === 'paid' && !isPaid) return false;
      if (paymentFilter === 'unpaid' && isPaid) return false;
      if (statusFilter !== 'all' && status !== statusFilter) return false;

      return true;
    });
  }, [lessons, search, locationFilter, dateFilter, paymentFilter, statusFilter, studentId]);

  const { upcomingLessons, pastLessonsByMonth } = useMemo(() => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    filteredLessons.forEach((lesson) => {
      const dt = lessonDateTime(lesson);
      if (dt > now) {
        upcoming.push(lesson);
      } else {
        past.push(lesson);
      }
    });

    upcoming.sort((a, b) => lessonDateTime(a) - lessonDateTime(b));
    past.sort((a, b) => lessonDateTime(b) - lessonDateTime(a));

    const grouped = past.reduce((acc, lesson) => {
      const key = formatMonthYear(lesson.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(lesson);
      return acc;
    }, {});

    return {
      upcomingLessons: upcoming,
      pastLessonsByMonth: grouped,
    };
  }, [filteredLessons]);

  const pastMonthKeys = useMemo(() => Object.keys(pastLessonsByMonth), [pastLessonsByMonth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Student Details" />
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

  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Student Details" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              This page is only available to admins.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Student Details" />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <button
                type="button"
                onClick={() => navigate(backPath)}
                className="mb-3 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back
              </button>

              <h1 className="text-2xl font-light text-gray-900">
                {studentLoading ? 'Loading student...' : student?.name || 'Student'}
              </h1>

              <p className="text-sm text-gray-600 mt-1">
                {student?.email || 'No email'}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>ID: {student?.id ?? studentId}</span>
                <span>·</span>
                <span>{student?.is_verified ? 'Verified' : 'Unverified'}</span>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {lessonsLoading ? 'Loading lessons...' : `${filteredLessons.length} lessons`}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="xl:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by subject, date, time, location, status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payment
              </label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">All</option>
                <option value="assigned">Assigned</option>
                <option value="attended">Attended</option>
                <option value="missed">Missed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                placeholder="Filter by location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setLocationFilter('');
                  setDateFilter('');
                  setPaymentFilter('all');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                Clear filters
              </button>
            </div>
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              Upcoming Lessons
            </h2>

            {lessonsLoading ? (
              <div className="text-sm text-gray-500">Loading lessons...</div>
            ) : upcomingLessons.length === 0 ? (
              <div className="text-sm text-gray-500">No upcoming lessons.</div>
            ) : (
              <div className="space-y-3">
                {upcomingLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    navigate={navigate}
                    studentId={studentId}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              Past Lessons by Month
            </h2>

            {lessonsLoading ? (
              <div className="text-sm text-gray-500">Loading lessons...</div>
            ) : pastMonthKeys.length === 0 ? (
              <div className="text-sm text-gray-500">No past lessons.</div>
            ) : (
              <div className="space-y-8">
                {pastMonthKeys.map((monthKey) => (
                  <div key={monthKey}>
                    <h3 className="text-md font-medium text-gray-800 mb-3">
                      {monthKey}
                    </h3>

                    <div className="space-y-3">
                      {pastLessonsByMonth[monthKey].map((lesson) => (
                        <LessonRow
                          key={lesson.id}
                          lesson={lesson}
                          navigate={navigate}
                          studentId={studentId}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManageStudentPage;