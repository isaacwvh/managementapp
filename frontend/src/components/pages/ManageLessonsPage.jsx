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

const getStudents = (lesson) => {
  if (!Array.isArray(lesson?.student_links)) return [];
  return lesson.student_links
    .map((link) => ({
      ...link,
      student: link?.student || null,
    }))
    .filter((link) => link.student);
};

const getAttendanceStatus = (studentLink) => {
  const raw =
    studentLink?.attendance ??
    studentLink?.attendance_status ??
    studentLink?.status ??
    '';

  return String(raw).trim().toLowerCase();
};

const statusStyles = (status) => {
  if (status === 'attended') {
    return 'bg-green-100 text-green-800 border border-green-200';
  }
  if (status === 'missed') {
    return 'bg-red-100 text-red-800 border border-red-200';
  }
  if (status === 'cancelled') {
    return 'bg-red-100 text-red-800 border border-red-200';
  }
  return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
  
};

const LessonRow = ({ lesson, navigate, isPast }) => {
  const students = getStudents(lesson);
  const subject = lesson?.subject || 'No subject';
  const location = lesson?.location || 'Unknown location';
  const duration = formatDuration(lesson?.duration);

  const hasPendingStudents = students.some((link) => {
    const status = getAttendanceStatus(link);
    return status !== 'attended' && status !== 'missed' && status !== 'cancelled';
  });

  return (
    <button
      type="button"
      onClick={() => navigate(`/lessons/${lesson.id}`)}
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

          {isPast && hasPendingStudents && (
            <div className="mt-2 inline-flex items-center rounded-lg bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-medium text-orange-800">
              Attendance still pending for one or more students — update their status
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {students.length === 0 ? (
              <span className="text-xs text-gray-400">No students</span>
            ) : (
              students.map((link, idx) => {
                const name = link?.student?.name || `Student ${idx + 1}`;
                const status = getAttendanceStatus(link);

                return (
                  <div
                    key={`${lesson.id}-${link?.student?.id || idx}`}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1"
                  >
                    <span className="text-xs text-gray-700">{name}</span>
                    <span
                      className={`text-[11px] font-medium rounded-full px-2 py-0.5 ${statusStyles(
                        status
                      )}`}
                    >
                      {status === 'attended'
                        ? 'Attended'
                        : status === 'missed'
                        ? 'Missed'
                        : status === 'cancelled'
                        ? 'Cancelled'
                        : 'Pending'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
          View details →
        </div>
      </div>
    </button>
  );
};

const ManageLessonsPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');

  const token = useMemo(() => localStorage.getItem('token'), []);
  const navigate = useNavigate();

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
    const fetchLessons = async () => {
      setLessonsLoading(true);

      try {
        if (!token || !role) return;

        if (role !== 'teacher') {
          setLessons([]);
          return;
        }

        const res = await fetch('/api/lessons/my-lessons', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || `Failed to load lessons (${res.status})`);
          setLessons([]);
          return;
        }

        const data = await res.json();
        const normalized = Array.isArray(data) ? data : [];
        setLessons(normalized);
      } catch {
        setError('Network error occurred while loading lessons');
        setLessons([]);
      } finally {
        setLessonsLoading(false);
      }
    };

    fetchLessons();
  }, [role, token]);

  const allStudentNames = useMemo(() => {
    const set = new Set();

    lessons.forEach((lesson) => {
      getStudents(lesson).forEach((link) => {
        const name = link?.student?.name?.trim();
        if (name) set.add(name);
      });
    });

    return [...set].sort((a, b) => a.localeCompare(b));
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const q = search.trim().toLowerCase();
    const studentQ = studentFilter.trim().toLowerCase();
    const locationQ = locationFilter.trim().toLowerCase();

    return lessons.filter((lesson) => {
      const students = getStudents(lesson);
      const studentNames = students
        .map((link) => link?.student?.name || '')
        .filter(Boolean);

      const haystack = [
        lesson?.subject || '',
        lesson?.location || '',
        lesson?.date || '',
        lesson?.time || '',
        ...studentNames,
      ]
        .join(' ')
        .toLowerCase();

      if (q && !haystack.includes(q)) return false;

      if (
        studentQ &&
        !studentNames.some((name) => name.toLowerCase().includes(studentQ))
      ) {
        return false;
      }

      if (
        locationQ &&
        !(lesson?.location || '').toLowerCase().includes(locationQ)
      ) {
        return false;
      }

      if (dateFilter && lesson?.date !== dateFilter) return false;

      if (priceFilter !== 'all') {
        const rawPrice = Number(lesson?.price || 0);
        if (priceFilter === 'lt50' && rawPrice >= 5000) return false;
        if (priceFilter === '50to100' && (rawPrice < 5000 || rawPrice > 10000)) return false;
        if (priceFilter === 'gt100' && rawPrice <= 10000) return false;
      }

      return true;
    });
  }, [lessons, search, studentFilter, locationFilter, dateFilter, priceFilter]);

  const { upcomingLessons, pastLessons } = useMemo(() => {
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

    upcoming.sort((a, b) => lessonDateTime(b) - lessonDateTime(a));
    past.sort((a, b) => lessonDateTime(b) - lessonDateTime(a));

    return {
      upcomingLessons: upcoming,
      pastLessons: past,
    };
  }, [filteredLessons]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Manage Lessons" />
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

  if (role !== 'teacher') {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Manage Lessons" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              This page is only available to teachers.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Manage Lessons" />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Manage Lessons</h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo?.name ? `${userInfo.name} · ` : ''}
                Teacher
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {lessonsLoading
                ? 'Loading lessons...'
                : `${filteredLessons.length} lessons`}
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
                placeholder="Search by student, subject, date, time, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Student
              </label>
              <input
                list="student-names"
                type="text"
                placeholder="Filter by student"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <datalist id="student-names">
                {allStudentNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
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
                Price
              </label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="all">All prices</option>
                <option value="lt50">Under $50</option>
                <option value="50to100">$50 - $100</option>
                <option value="gt100">Over $100</option>
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
                  setStudentFilter('');
                  setLocationFilter('');
                  setDateFilter('');
                  setPriceFilter('all');
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
                    isPast={false}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="mt-10 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              Past Lessons
            </h2>

            {lessonsLoading ? (
              <div className="text-sm text-gray-500">Loading lessons...</div>
            ) : pastLessons.length === 0 ? (
              <div className="text-sm text-gray-500">No past lessons.</div>
            ) : (
              <div className="space-y-3">
                {pastLessons.map((lesson) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    navigate={navigate}
                    isPast={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageLessonsPage;