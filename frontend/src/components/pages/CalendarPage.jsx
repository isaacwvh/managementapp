/* =====================================================================================
   FILE: src/components/pages/CalendarPage.jsx
   ===================================================================================== */
import React, { useEffect, useMemo, useState } from 'react';
import AppNavbar from '../layout/AppNavbar.jsx';

const pad2 = (n) => String(n).padStart(2, '0');

const toDateKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseApiDate = (dateStr) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

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

const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
const startOfWeek = (d) => addDays(d, -d.getDay()); // Sunday start
const endOfWeek = (d) => addDays(d, 6 - d.getDay());

const monthLabel = (d) =>
  d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const namesSummary = (users, emptyLabel) => {
  const list = Array.isArray(users) ? users : [];
  const names = list.map((u) => u?.name).filter(Boolean);

  if (names.length === 0) return emptyLabel;
  if (names.length === 1) return names[0];
  if (names.length <= 3) return names.join(', ');
  return `${names[0]} +${names.length - 1} more`;
};

const CalendarPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('');
  const [lessons, setLessons] = useState([]);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [lessonsLoading, setLessonsLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentEndpointMissing, setStudentEndpointMissing] = useState(false);

  const token = useMemo(() => localStorage.getItem('token'), []);

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
      setError('');
      setStudentEndpointMissing(false);

      try {
        if (!token || !role) return;

        const endpoint =
          role === 'teacher'
            ? '/api/lessons/my-lessons'
            : '/api/lessons/my-upcoming'; // not implemented yet

        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (role === 'student' && (res.status === 404 || res.status === 405)) {
            setStudentEndpointMissing(true);
            setLessons([]);
            return;
          }
          const msg = await res.text();
          setError(msg || `Failed to load lessons (${res.status})`);
          setLessons([]);
          return;
        }

        const data = await res.json();
        const normalized = Array.isArray(data) ? data : [];

        normalized.sort((a, b) => {
          const da = parseApiDate(a.date)?.getTime() ?? 0;
          const db = parseApiDate(b.date)?.getTime() ?? 0;
          if (da !== db) return da - db;
          const ta = parseApiTime(a.time);
          const tb = parseApiTime(b.time);
          if (ta.h !== tb.h) return ta.h - tb.h;
          return ta.m - tb.m;
        });

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

  const lessonsByDate = useMemo(() => {
    const map = new Map();
    for (const lesson of lessons) {
      const key = lesson?.date;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(lesson);
    }
    for (const [key, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ta = parseApiTime(a.time);
        const tb = parseApiTime(b.time);
        if (ta.h !== tb.h) return ta.h - tb.h;
        return ta.m - tb.m;
      });
      map.set(key, arr);
    }
    return map;
  }, [lessons]);

  const gridDays = useMemo(() => {
    const mStart = startOfMonth(viewDate);
    const mEnd = endOfMonth(viewDate);
    const gridStart = startOfWeek(mStart);
    const gridEnd = endOfWeek(mEnd);

    const days = [];
    let cur = new Date(gridStart);
    while (cur <= gridEnd) {
      days.push(new Date(cur));
      cur = addDays(cur, 1);
    }
    return days;
  }, [viewDate]);

  const todayKey = toDateKey(new Date());
  const viewMonth = viewDate.getMonth();
  const viewYear = viewDate.getFullYear();

  const getCounterpartLine = (lesson) => {
    if (role === 'teacher') {
      // teacher sees students
      return namesSummary(lesson?.students, 'No students');
    }
    // student sees teachers (future)
    return namesSummary(lesson?.teachers, '(teachers TBD)');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Calendar" />
        <div className="max-w-5xl mx-auto p-6">
          <div className="flex items-center justify-center py-16 text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Calendar" />

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">{monthLabel(viewDate)}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo?.name ? `${userInfo.name} · ` : ''}
                {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'User'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                ← Prev
              </button>
              <button
                onClick={() => setViewDate(new Date())}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>

          {(error || studentEndpointMissing) && (
            <div className="mt-4">
              {studentEndpointMissing ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  Student calendar endpoint isn’t implemented yet. Once you add it, this page will
                  automatically show upcoming lessons here.
                </div>
              ) : (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}

          <div className="mt-6">
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
              {weekdays.map((w) => (
                <div key={w} className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                  {w}
                </div>
              ))}

              {gridDays.map((day) => {
                const key = toDateKey(day);
                const inMonth = day.getMonth() === viewMonth && day.getFullYear() === viewYear;
                const isToday = key === todayKey;
                const dayLessons = lessonsByDate.get(key) || [];

                return (
                  <div
                    key={key}
                    className={['bg-white min-h-[140px] p-2', !inMonth ? 'opacity-50' : ''].join(
                      ' '
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          'text-sm font-medium',
                          isToday ? 'text-blue-700' : 'text-gray-900',
                        ].join(' ')}
                      >
                        {day.getDate()}
                      </span>
                      {dayLessons.length > 0 && (
                        <span className="text-[11px] text-gray-500">{dayLessons.length}</span>
                      )}
                    </div>

                    <div className="mt-2 space-y-2">
                      {dayLessons.slice(0, 3).map((lesson) => {
                        const location = lesson?.location || 'Unknown location';
                        const counterpart = getCounterpartLine(lesson);

                        return (
                          <div
                            key={lesson.id}
                            className="text-[12px] rounded-md border border-gray-200 bg-gray-50 px-2 py-2"
                            title={`${formatTime(lesson.time)} · ${location} · ${counterpart}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-gray-800">
                                {formatTime(lesson.time)}
                              </span>
                              <span className="text-gray-600 truncate">{location}</span>
                            </div>

                            <div className="mt-1 text-gray-700 truncate">
                              {role === 'teacher' ? 'Students: ' : 'Teacher: '}
                              <span className="text-gray-600">{counterpart}</span>
                            </div>
                          </div>
                        );
                      })}

                      {dayLessons.length > 3 && (
                        <div className="text-[12px] text-gray-500">
                          +{dayLessons.length - 3} more
                        </div>
                      )}

                      {!lessonsLoading && inMonth && dayLessons.length === 0 && (
                        <div className="text-[12px] text-gray-300">—</div>
                      )}

                      {lessonsLoading && <div className="text-[12px] text-gray-400">Loading…</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 border-t pt-4">
            <h2 className="text-sm font-medium text-gray-900">Upcoming (next 10)</h2>
            <div className="mt-2 space-y-2">
              {lessonsLoading ? (
                <div className="text-sm text-gray-500">Loading lessons…</div>
              ) : lessons.length === 0 ? (
                <div className="text-sm text-gray-500">No lessons found.</div>
              ) : (
                lessons.slice(0, 10).map((l) => {
                  const location = l?.location || 'Unknown location';
                  const counterpart = getCounterpartLine(l);

                  return (
                    <div
                      key={l.id}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg border border-gray-200 bg-white"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900">
                          {l.date} · {formatTime(l.time)}
                        </div>
                        <div className="text-sm text-gray-600 truncate">{location}</div>
                        <div className="text-sm text-gray-600 truncate">
                          {role === 'teacher' ? 'Students: ' : 'Teacher: '}
                          {counterpart}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 whitespace-nowrap">
                        ${(Number(l.price || 0) / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;


/* =====================================================================================
   OPTIONAL BACKEND: add student endpoint (so the page works for students)
   FILE: app/api/routes/lessons.py   (same router)
   =====================================================================================

from datetime import date

@router.get("/my-upcoming", response_model=List[LessonRead])
def get_my_upcoming_lessons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    today = date.today()
    return (
        db.query(Lesson)
        .filter(
            Lesson.students.any(id=current_user.id),
            Lesson.date >= today,
        )
        .order_by(Lesson.date, Lesson.time)
        .all()
    )

*/
