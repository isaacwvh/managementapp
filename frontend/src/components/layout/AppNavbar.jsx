// src/components/layout/AppNavbar.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const AppNavbar = ({
  title = 'Dashboard',
  showHome = true,
  showCalendar = true,
  showCreateLesson = true,
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        setUserInfo(data);
      } catch {
        // ignore; navbar should still render
      }
    };

    fetchMe();
  }, []);

  const role = useMemo(() => (userInfo?.role || '').toLowerCase(), [userInfo]);
  const isTeacher = role === 'teacher';

  const onNav = (to) => {
    if (location.pathname !== to) navigate(to);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            {showHome && (
              <button
                onClick={() => onNav('/')}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Home
              </button>
            )}

            {showCreateLesson && isTeacher && (
              <button
                onClick={() => onNav('/create-lesson')}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Create Lesson
              </button>
            )}

            {showCalendar && (
              <button
                onClick={() => onNav('/calendar')}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Calendar
              </button>
            )}

            <span className="ml-2 text-xl font-semibold text-gray-900">{title}</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {userInfo?.name ? `Hi, ${userInfo.name}` : 'Welcome'}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
