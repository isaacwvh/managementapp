import React, { useEffect, useMemo, useState } from 'react';
import AppNavbar from '../layout/AppNavbar.jsx';

const ProfilePage = () => {
  const token = useMemo(() => localStorage.getItem('token'), []);

  const [userInfo, setUserInfo] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      setLoading(true);
      setError('');
      setSuccess('');

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

        if (!response.ok) {
          const errorText = await response.text();
          setError(errorText || 'Failed to load profile');
          return;
        }

        const data = await response.json();
        setUserInfo(data);
        setFormData({
          name: data?.name || '',
        });
      } catch {
        setError('Network error occurred while loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = () => {
    setSuccess('');
    setError('');
    setEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      name: userInfo?.name || '',
    });
    setError('');
    setSuccess('');
    setEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setError(errorText || 'Failed to update profile');
        return;
      }

      const updatedUser = await response.json();
      setUserInfo(updatedUser);
      setFormData({
        name: updatedUser?.name || '',
      });
      setSuccess('Profile updated successfully.');
      setEditing(false);
    } catch {
      setError('Network error occurred while saving profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Profile" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-center py-16 text-gray-600">
              Loading...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Profile" />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error || 'Unable to load profile.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Profile" />

      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-light text-gray-900">My Profile</h1>
              <p className="mt-1 text-sm text-gray-600">
                View and manage your account information.
              </p>
            </div>

            {!editing ? (
              <button
                type="button"
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              >
                Edit profile
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
              {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Name
              </label>

              {editing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              ) : (
                <div className="text-gray-900 text-base">{userInfo.name || '-'}</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Email
              </label>
              <div className="text-gray-900 text-base break-all">
                {userInfo.email || '-'}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Email editing will be added later with verification.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Role
              </label>
              <div className="text-gray-900 text-base capitalize">
                {userInfo.role || '-'}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-5">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Organisation ID
              </label>
              <div className="text-gray-900 text-base">
                {userInfo.organisation_id ?? '-'}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                Account Status
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                    userInfo.is_verified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {userInfo.is_verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;