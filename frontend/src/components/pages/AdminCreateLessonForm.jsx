import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import AppNavbar from '../layout/AppNavbar.jsx';
import { useNavigate } from 'react-router-dom';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '1.5', label: '1.5 hours' },
  { value: '2', label: '2 hours' },
  { value: '2.5', label: '2.5 hours' },
  { value: '3', label: '3 hours' },
];

const AdminLessonCreateForm = () => {
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

  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        };

        const [meResponse, teachersResponse, studentsResponse] = await Promise.all([
          fetch('/api/users/me', { headers }),
          fetch('/api/users/teachers', { headers }),
          fetch('/api/users/students', { headers }),
        ]);

        if (!meResponse.ok || !teachersResponse.ok || !studentsResponse.ok) {
          throw new Error('Failed to fetch required data');
        }

        const meData = await meResponse.json();
        const teachersData = await teachersResponse.json();
        const studentsData = await studentsResponse.json();

        const teacherList = Array.isArray(teachersData) ? teachersData : [];
        const studentList = Array.isArray(studentsData) ? studentsData : [];

        setFormData((prev) => ({
          ...prev,
          organisation_id: String(meData.organisation_id ?? ''),
        }));

        setTeachers(teacherList);
        setStudents(studentList);
        setFilteredTeachers(teacherList);
        setFilteredStudents(studentList);
      } catch {
        setError('Failed to load required data');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

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

  const validateForm = () => {
    const errors = {};

    if (!formData.date) errors.date = 'Date is required';
    if (!formData.time) errors.time = 'Time is required';
    if (!formData.subject.trim()) errors.subject = 'Subject is required';
    if (!formData.duration) errors.duration = 'Duration is required';
    if (!formData.location.trim()) errors.location = 'Location is required';

    if (formData.price === '' || formData.price === null) {
      errors.price = 'Price is required';
    } else if (isNaN(parseFloat(formData.price))) {
      errors.price = 'Price must be a valid number';
    } else if (parseFloat(formData.price) <= 0) {
      errors.price = 'Price must be greater than 0';
    }

    if (!formData.teacher_ids.length) {
      errors.teacher_ids = 'Please select at least one teacher';
    }

    if (!formData.student_ids.length) {
      errors.student_ids = 'Please select at least one student';
    }

    if (!formData.organisation_id) {
      errors.organisation_id = 'Organisation could not be determined';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setError('');
  };

  const handleMultiSelect = (name, id) => {
    setFormData((prev) => ({
      ...prev,
      [name]: prev[name].includes(id)
        ? prev[name].filter((item) => item !== id)
        : [...prev[name], id],
    }));

    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess(false);

    if (!validateForm()) {
      setError('Please fill in all required fields before submitting.');
      return;
    }

    setLoading(true);

    try {
      const submitData = {
        ...formData,
        organisation_id: Number(formData.organisation_id),
        duration: parseFloat(formData.duration),
        price: Math.round(parseFloat(formData.price) * 100),
      };

      const token = localStorage.getItem('token');
      const response = await fetch('/api/lessons/admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          typeof errorData.detail === 'string'
            ? errorData.detail
            : `Error ${response.status}: ${response.statusText}`
        );
      }

      await response.json();
      setSuccess(true);
      setFieldErrors({});

      navigate('/admin/manage-lessons');
    } catch (err) {
      setError(err?.message || 'Failed to create lesson. Please try again.');
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

  const inputClass = (fieldName) =>
    `w-full px-3 py-2 border rounded-sm focus:outline-none focus:ring-1 ${
      fieldErrors[fieldName]
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
    }`;

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar title="Create Lesson" />
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
      <AppNavbar title="Create Lesson" />
      <div className="max-w-2xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-light text-gray-900 mb-2">Create New Lesson</h1>
          <p className="text-gray-600">Fill in the details for your new lesson</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-sm">
            <p className="text-green-800 text-sm">Lesson created successfully!</p>
          </div>
        )}

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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className={inputClass('date')}
                />
                {fieldErrors.date && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.date}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className={inputClass('time')}
                />
                {fieldErrors.time && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.time}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  placeholder="Enter lesson subject"
                  className={inputClass('subject')}
                />
                {fieldErrors.subject && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.subject}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duration (hours) <span className="text-red-500">*</span>
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className={`${inputClass('duration')} bg-white`}
                >
                  {DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {fieldErrors.duration && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.duration}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Enter lesson location"
                className={inputClass('location')}
              />
              {fieldErrors.location && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.location}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price (per hour) <span className="text-red-500">*</span>
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
                  className={`w-full pl-8 pr-3 py-2 border rounded-sm focus:outline-none focus:ring-1 ${
                    fieldErrors.price
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
                  }`}
                />
              </div>
              {fieldErrors.price && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.price}</p>
              )}
            </div>
          </div>

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

            <div
              className={`border rounded-sm max-h-48 overflow-y-auto ${
                fieldErrors.teacher_ids ? 'border-red-500' : 'border-gray-200'
              }`}
            >
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

            {fieldErrors.teacher_ids && (
              <p className="text-sm text-red-600">{fieldErrors.teacher_ids}</p>
            )}
          </div>

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

            <div
              className={`border rounded-sm max-h-48 overflow-y-auto ${
                fieldErrors.student_ids ? 'border-red-500' : 'border-gray-200'
              }`}
            >
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

            {fieldErrors.student_ids && (
              <p className="text-sm text-red-600">{fieldErrors.student_ids}</p>
            )}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gray-900 text-white py-3 px-4 rounded-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Lesson...' : 'Create Lesson'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLessonCreateForm;