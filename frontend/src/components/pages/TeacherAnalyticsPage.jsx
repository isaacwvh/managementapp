import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatMoney = (cents) => {
  const n = Number(cents || 0);
  return `$${(n / 100).toFixed(2)}`;
};

const formatDuration = (duration) => {
  const n = Number(duration);
  if (!Number.isFinite(n)) return 0;

  // if backend stores minutes
  if (n >= 10) return n / 60;

  // fallback if backend stores hours
  return n;
};

const formatDurationLabel = (duration) => {
  const hours = formatDuration(duration);
  if (!Number.isFinite(hours) || hours <= 0) return '';
  return `${hours % 1 === 0 ? hours.toFixed(0) : hours}h`;
};

const getStudentLinks = (lesson) => {
  if (!Array.isArray(lesson?.student_links)) return [];
  return lesson.student_links;
};

const isPaidLink = (link) => {
  const status = String(link?.payment_status || '').trim().toLowerCase();
  return status === 'paid';
};

const TeacherAnalyticsPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('');
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [error, setError] = useState('');

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
        normalized.sort((a, b) => lessonDateTime(b) - lessonDateTime(a));
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

  const groupedMonths = useMemo(() => {
    const groups = new Map();

    lessons.forEach((lesson) => {
      const d = parseApiDate(lesson?.date);
      if (!d) return;

      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthKey = `${year}-${pad2(monthIndex + 1)}`;

      if (!groups.has(monthKey)) {
        groups.set(monthKey, {
          monthKey,
          year,
          monthIndex,
          monthName: MONTH_NAMES[monthIndex],
          lessons: [],
        });
      }

      groups.get(monthKey).lessons.push(lesson);
    });

    const monthCards = [...groups.values()]
      .map((group) => {
        const sortedLessons = [...group.lessons].sort(
          (a, b) => lessonDateTime(b) - lessonDateTime(a)
        );

        let moneyEarnedCents = 0;
        const uniquePaidStudents = new Map();
        const subjectsSet = new Set();

        const lessonRows = sortedLessons.map((lesson) => {
          const priceCents = Number(lesson?.price || 0);
          const durationHours = formatDuration(lesson?.duration);
          const subject = lesson?.subject || 'No subject';
          const paidLinks = getStudentLinks(lesson).filter(isPaidLink);

          if (paidLinks.length > 0) {
            subjectsSet.add(subject);
          }

          paidLinks.forEach((link) => {
            moneyEarnedCents += Math.round(priceCents * durationHours);

            const student = link?.student;
            const studentId = student?.id ?? link?.student_id;
            if (studentId != null) {
              uniquePaidStudents.set(studentId, student);
            }
          });

          return {
            id: lesson.id,
            date: lesson.date,
            time: lesson.time,
            location: lesson?.location || 'Unknown location',
            subject,
            durationLabel: formatDurationLabel(lesson?.duration),
            paidCount: paidLinks.length,
            revenueCents: Math.round(priceCents * durationHours * paidLinks.length),
          };
        });

        return {
          ...group,
          lessons: lessonRows,
          moneyEarnedCents,
          totalStudentsTaught: uniquePaidStudents.size,
          subjectsTaught: [...subjectsSet].sort((a, b) => a.localeCompare(b)),
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.monthIndex - a.monthIndex;
      });

    return monthCards;
  }, [lessons]);

  const topSummary = useMemo(() => {
    let totalMoneyCents = 0;
    const allPaidStudents = new Map();
    const allSubjects = new Set();

    groupedMonths.forEach((month) => {
      totalMoneyCents += month.moneyEarnedCents;
      month.subjectsTaught.forEach((s) => allSubjects.add(s));

      month.lessons.forEach((lesson) => {
        const original = lessons.find((l) => l.id === lesson.id);
        getStudentLinks(original)
          .filter(isPaidLink)
          .forEach((link) => {
            const student = link?.student;
            const studentId = student?.id ?? link?.student_id;
            if (studentId != null) {
              allPaidStudents.set(studentId, student);
            }
          });
      });
    });

    return {
      totalMoneyCents,
      totalStudents: allPaidStudents.size,
      totalSubjects: allSubjects.size,
      totalMonths: groupedMonths.length,
    };
  }, [groupedMonths, lessons]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Analytics" />
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
        <AppNavbar title="Analytics" />
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
      <AppNavbar title="Analytics" />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Teacher Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo?.name ? `${userInfo.name} · ` : ''}
                Teacher
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {lessonsLoading ? 'Loading lessons...' : `${groupedMonths.length} monthly views`}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-500">Total earned</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatMoney(topSummary.totalMoneyCents)}
              </div>
              <div className="mt-1 text-xs text-gray-500">Paid students only</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-500">Students taught</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {topSummary.totalStudents}
              </div>
              <div className="mt-1 text-xs text-gray-500">Unique paid students</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-500">Subjects taught</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {topSummary.totalSubjects}
              </div>
              <div className="mt-1 text-xs text-gray-500">Paid months only</div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
              <div className="text-sm text-gray-500">Months shown</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {topSummary.totalMonths}
              </div>
              <div className="mt-1 text-xs text-gray-500">Grouped by year and month</div>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {lessonsLoading ? (
              <div className="text-sm text-gray-500">Loading analytics...</div>
            ) : groupedMonths.length === 0 ? (
              <div className="text-sm text-gray-500">No lessons found.</div>
            ) : (
              groupedMonths.map((month) => (
                <div key={month.monthKey} className="border-t pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        {month.monthName} {month.year}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Based only on student records marked as paid
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:min-w-[420px]">
                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="text-xs text-gray-500">Money earned</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">
                          {formatMoney(month.moneyEarnedCents)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="text-xs text-gray-500">Students taught</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">
                          {month.totalStudentsTaught}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="text-xs text-gray-500">Subjects taught</div>
                        <div className="mt-1 text-lg font-semibold text-gray-900">
                          {month.subjectsTaught.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {month.subjectsTaught.length > 0 ? (
                      month.subjectsTaught.map((subject) => (
                        <span
                          key={subject}
                          className="inline-flex rounded-full bg-gray-100 border border-gray-200 px-3 py-1 text-xs text-gray-700"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-400">No paid subjects this month</span>
                    )}
                  </div>

                  <div className="mt-4 space-y-2">
                    {month.lessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() =>
                          navigate(`/lessons/${lesson.id}`, {
                            state: { from: '/analytics' },
                          })
                        }
                        className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50 transition"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDate(lesson.date)} · {formatTime(lesson.time)}
                            </div>
                            <div className="mt-1 text-sm text-gray-600 truncate">
                              {lesson.subject}
                              {lesson.durationLabel ? ` · ${lesson.durationLabel}` : ''}
                              {lesson.location ? ` · ${lesson.location}` : ''}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-800">
                              {lesson.paidCount} paid
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatMoney(lesson.revenueCents)}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnalyticsPage;