import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

const AdminManageStudentsPage = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [role, setRole] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
    const fetchStudents = async () => {
      setStudentsLoading(true);

      try {
        if (!token || !role) return;

        if (role !== 'admin') {
          setStudents([]);
          return;
        }

        const res = await fetch('/api/users/students', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const msg = await res.text();
          setError(msg || `Failed to load students (${res.status})`);
          setStudents([]);
          return;
        }

        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch {
        setError('Network error occurred while loading students');
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };

    fetchStudents();
  }, [role, token]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return students;

    return students.filter((student) => {
      const haystack = [
        student?.name || '',
        student?.email || '',
        student?.id || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [students, search]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Manage Students" />
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
        <AppNavbar title="Manage Students" />
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
      <AppNavbar title="Manage Students" />

      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-light text-gray-900">Manage Students</h1>
              <p className="text-sm text-gray-600 mt-1">
                {userInfo?.name ? `${userInfo.name} · ` : ''}
                Admin
              </p>
            </div>

            <div className="text-sm text-gray-500">
              {studentsLoading ? 'Loading students...' : `${filteredStudents.length} students`}
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by student name, email, or id..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          <div className="mt-8 border-t pt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">
              Students
            </h2>

            {studentsLoading ? (
              <div className="text-sm text-gray-500">Loading students...</div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-sm text-gray-500">No students found.</div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() =>
                      navigate(`/admin/students/${student.id}`, {
                        state: { from: '/admin/students' },
                      })
                    }
                    className="w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-gray-900">
                          {student.name || 'Unnamed student'}
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                          {student.email || 'No email'}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>ID: {student.id}</span>
                          <span>·</span>
                          <span>{student.is_verified ? 'Verified' : 'Unverified'}</span>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs text-gray-400 whitespace-nowrap">
                        View student →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManageStudentsPage;