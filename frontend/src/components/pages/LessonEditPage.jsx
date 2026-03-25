// src/components/pages/LessonEditPage.jsx
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import AppNavbar from '../layout/AppNavbar.jsx';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '1.5', label: '1.5 hours' },
  { value: '2', label: '2 hours' },
  { value: '2.5', label: '2.5 hours' },
  { value: '3', label: '3 hours' },
];

const LessonEditPage = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTo = location.state?.from || `/lessons/${lessonId}`;

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    subject: '',
    duration: '1',
    location: '',
    price: '',
    teacher_ids: [],
    student_ids: [],
    organisation_id: '',
  });

  const [userRole, setUserRole] = useState('');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRole = async () => {
      setRoleLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');

        if (!token) {
          setError('No authentication token found. Please log in.');
          setAllowed(false);
          return;
        }

        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to verify user access');
        }

        const user = await response.json();
        const role = String(user?.role || '').toLowerCase();

        setUserRole(role);

        if (role === 'teacher' || role === 'admin') {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch {
        setError('Failed to verify access');
        setAllowed(false);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRole();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      setPageLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const lessonPromise = fetch(`/api/lessons/${lessonId}`, { headers });
        const studentsPromise = fetch('/api/users/students', { headers });

        const teachersPromise =
          userRole === 'admin'
            ? fetch('/api/users/teachers', { headers })
            : Promise.resolve(null);

        const [lessonResponse, studentsResponse, teachersResponse] =
          await Promise.all([lessonPromise, studentsPromise, teachersPromise]);

        if (!lessonResponse.ok || !studentsResponse.ok) {
          throw new Error('Failed to fetch lesson data');
        }

        if (teachersResponse && !teachersResponse.ok) {
          throw new Error('Failed to fetch teachers');
        }

        const lessonData = await lessonResponse.json();
        const studentsData = await studentsResponse.json();
        const teachersData = teachersResponse ? await teachersResponse.json() : [];

        const teachersArray = Array.isArray(teachersData) ? teachersData : [];
        const studentsArray = Array.isArray(studentsData) ? studentsData : [];

        setTeachers(teachersArray);
        setStudents(studentsArray);
        setFilteredTeachers(teachersArray);
        setFilteredStudents(studentsArray);

        const teacherIds = Array.isArray(lessonData?.teachers)
          ? lessonData.teachers.map((teacher) => teacher.id)
          : [];

        const studentIds = Array.isArray(lessonData?.student_links)
          ? lessonData.student_links
              .map((link) => link?.student?.id ?? link?.student_id)
              .filter((id) => id != null)
          : Array.isArray(lessonData?.students)
          ? lessonData.students.map((student) => student.id)
          : [];

        const rawPrice = Number(lessonData?.price || 0);
        const priceInDollars = rawPrice ? (rawPrice / 100).toFixed(2) : '';

        const rawDuration = Number(lessonData?.duration || 60);
        const durationInHours =
          rawDuration >= 10 ? String(rawDuration / 60) : String(rawDuration);

        setFormData({
          date: lessonData?.date || '',
          time: lessonData?.time ? lessonData.time.slice(0, 5) : '',
          subject: lessonData?.subject || '',
          duration: durationInHours,
          location: lessonData?.location || '',
          price: priceInDollars,
          teacher_ids: teacherIds,
          student_ids: studentIds,
          organisation_id: String(lessonData?.organisation_id ?? '1'),
        });
      } catch {
        setError('Failed to load lesson data');
      } finally {
        setDataLoading(false);
        setPageLoading(false);
      }
    };

    if (allowed && userRole) {
      fetchData();
    } else if (!roleLoading) {
      setPageLoading(false);
    }
  }, [allowed, roleLoading, lessonId, userRole]);

  useEffect(() => {
    const filtered = teachers.filter(
      (teacher) =>
        teacher.name?.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        teacher.email?.toLowerCase().includes(teacherSearch.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [teacherSearch, teachers]);

  useEffect(() => {
    const filtered = students.filter(
      (student) =>
        student.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearch.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [studentSearch, students]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMultiSelect = (name, id) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name].includes(id)
        ? prev[name].filter((item) => item !== id)
        : [...prev[name], id],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const submitData = {
        ...formData,
        duration: parseFloat(formData.duration),
        price: Math.round(parseFloat(formData.price) * 100),
        organisation_id: parseInt(formData.organisation_id || '1', 10),
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail =
          typeof errorData.detail === 'string'
            ? errorData.detail
            : JSON.stringify(errorData.detail || {});
        throw new Error(detail || `Error ${response.status}: ${response.statusText}`);
      }

      await response.json();
      navigate(`/lessons/${lessonId}`, {
        state: { from: backTo },
      });
    } catch (err) {
      setError(err?.message || 'Failed to update lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCount = (selectedIds) => selectedIds.length;

  const getSelectedNames = (selectedIds, allItems) => {
    const selected = allItems.filter((item) => selectedIds.includes(item.id));
    if (selected.length === 0) return 'None selected';
    if (selected.length === 1) return selected[0].name;
    if (selected.length <= 3) return selected.map((item) => item.name).join(', ');
    return `${selected[0].name} and ${selected.length - 1} others`;
  };

  if (roleLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Edit Lesson" />
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Edit Lesson" />
        <div className="max-w-2xl mx-auto p-6">
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm">
            <p className="text-red-800 text-sm">
              This page is only accessible to teachers and admins.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="w-full bg-gray-900 text-white py-3 px-4 rounded-sm hover:bg-gray-800 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Edit Lesson" />
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar title="Edit Lesson" />
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-gray-900 mb-2">Edit Lesson</h1>
          <p className="text-gray-600">Update the details for this lesson</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-sm">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Lesson Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Enter lesson subject"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (hours)
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter lesson location"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (in dollars)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
            </div>
          </div>

          {userRole === 'admin' && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Select Teachers
              </h2>
              <div className="text-sm text-gray-600 mb-2">
                {getSelectedCount(formData.teacher_ids)} selected:{' '}
                {getSelectedNames(formData.teacher_ids, teachers)}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search teachers..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>

              <div className="border border-gray-200 rounded-sm max-h-48 overflow-y-auto">
                {filteredTeachers.length === 0 ? (
                  <div className="p-4 text-gray-500 text-sm">No teachers found</div>
                ) : (
                  filteredTeachers.map((teacher) => (
                    <label
                      key={teacher.id}
                      className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={formData.teacher_ids.includes(teacher.id)}
                        onChange={() => handleMultiSelect('teacher_ids', teacher.id)}
                        className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{teacher.name}</p>
                        <p className="text-sm text-gray-500">{teacher.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Select Students
            </h2>
            <div className="text-sm text-gray-600 mb-2">
              {getSelectedCount(formData.student_ids)} selected:{' '}
              {getSelectedNames(formData.student_ids, students)}
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search students..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:ring-1 focus:ring-gray-500 focus:border-gray-500"
              />
            </div>

            <div className="border border-gray-200 rounded-sm max-h-48 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="p-4 text-gray-500 text-sm">No students found</div>
              ) : (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={formData.student_ids.includes(student.id)}
                      onChange={() => handleMultiSelect('student_ids', student.id)}
                      className="h-4 w-4 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{student.name}</p>
                      <p className="text-sm text-gray-500">{student.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => navigate(backTo)}
              className="w-full bg-white text-gray-900 py-3 px-4 rounded-sm border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating Lesson...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { LessonEditPage };
export default LessonEditPage;