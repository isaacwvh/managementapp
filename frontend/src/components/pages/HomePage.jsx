// src/components/pages/HomePage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppNavbar from '../layout/AppNavbar.jsx';

export const HomePage = () => {
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setError('No authentication token found. Please log in.');
          setLoading(false);
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
        setError('Network error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  const role = useMemo(() => (userInfo?.role || '').toLowerCase(), [userInfo]);
  const isTeacher = role === 'teacher';

  const handleCreateLesson = () => navigate('/create-lesson');
  const handleViewCalendar = () => navigate('/calendar');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Dashboard" />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Dashboard" />

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* User Information Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-gray-900">Profile Information</h2>
            <div className="flex items-center space-x-3">
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                {role || 'unknown'}
              </span>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  userInfo?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {userInfo?.is_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
          </div>

          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600">{error}</p>
            </div>
          ) : userInfo ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-lg text-gray-900">{userInfo.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-lg text-gray-900">{userInfo.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-lg text-gray-900 capitalize">{userInfo.role}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                  <p className="text-lg text-gray-900">#{userInfo.id}</p>
                </div>
                {userInfo.organisation_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organisation ID
                    </label>
                    <p className="text-lg text-gray-900">#{userInfo.organisation_id}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Quick Actions (role-based) */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            {isTeacher && (
              <button
                onClick={handleCreateLesson}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
              >
                <span className="mr-2">📝</span>
                Create Lesson
              </button>
            )}
            <button
              onClick={handleViewCalendar}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
            >
              <span className="mr-2">📅</span>
              View Calendar
            </button>
          </div>
        </div>

        {/* Dashboard Overview (unchanged) */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Dashboard Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📊</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                  <p className="text-sm text-gray-600">View your data insights</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">⚙️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-600">Manage your preferences</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">Team</h3>
                  <p className="text-sm text-gray-600">Collaborate with others</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Successfully logged in</span>
                </div>
                <span className="text-xs text-gray-500">Just now</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-700">Profile information loaded</span>
                </div>
                <span className="text-xs text-gray-500">Earlier today</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
