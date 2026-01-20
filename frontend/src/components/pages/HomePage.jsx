// src/components/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user information from /me endpoint
useEffect(() => {
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token'); // Changed from 'token' to match AuthContext
      
      console.log('Fetching user info...');
      console.log('Token from localStorage:', token ? `${token.substring(0, 20)}...` : 'null');
      
      if (!token) {
        console.error('No token found in localStorage');
        setError('No authentication token found. Please log in.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData);
        setUserInfo(userData);
      } else {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        
        if (response.status === 401) {
          console.error('401 Unauthorized - removing invalid token');
          localStorage.removeItem('token');
          setError('Authentication failed. Please log in again.');
        } else {
          setError(`Failed to fetch user information: ${errorText}`);
        }
      }
    } catch (err) {
      console.error('Network error occurred:', err);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  fetchUserInfo();
}, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateLesson = () => {
    navigate('/create-lesson');
  };

  const handleViewCalendar = () => {
    navigate('/calendar');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Bar */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome back, {userInfo?.name || 'User'}!
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* User Information Card */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-light text-gray-900">Profile Information</h2>
            <div className="flex items-center">
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                userInfo?.is_verified 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organisation ID</label>
                    <p className="text-lg text-gray-900">#{userInfo.organisation_id}</p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Quick Actions</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleCreateLesson}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
            >
              <span className="mr-2">📝</span>
              Create Lesson
            </button>
            <button
              onClick={handleViewCalendar}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
            >
              <span className="mr-2">📅</span>
              View Calendar
            </button>
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-light text-gray-900 mb-6">Dashboard Overview</h2>
          
          {/* Quick Stats Cards */}
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

          {/* Recent Activity */}
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