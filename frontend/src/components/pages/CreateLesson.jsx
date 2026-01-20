import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const LessonCreateForm = () => {
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    price: '',
    teacher_ids: [],
    student_ids: [],
    organisation_id: ''
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

  // Fetch teachers and students from API
  useEffect(() => {
    const fetchData = async () => {
      setDataLoading(true);
      try {
        // Replace with your actual API base URL and auth token
        const token = localStorage.getItem('token'); // Adjust based on your auth setup
        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        const [teachersResponse, studentsResponse] = await Promise.all([
          fetch('/api/users/teachers', { headers }),
          fetch('/api/users/students', { headers })
        ]);

        if (!teachersResponse.ok || !studentsResponse.ok) {
          throw new Error('Failed to fetch users');
        }

        const teachersData = await teachersResponse.json();
        const studentsData = await studentsResponse.json();

        setTeachers(teachersData);
        setStudents(studentsData);
        setFilteredTeachers(teachersData);
        setFilteredStudents(studentsData);

      } catch (err) {
        setError('Failed to load teachers and students');
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter teachers based on search
  useEffect(() => {
    const filtered = teachers.filter(teacher =>
      teacher.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
      teacher.email.toLowerCase().includes(teacherSearch.toLowerCase())
    );
    setFilteredTeachers(filtered);
  }, [teacherSearch, teachers]);

  // Filter students based on search
  useEffect(() => {
    const filtered = students.filter(student =>
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearch.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [studentSearch, students]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMultiSelect = (name, id) => {
    setFormData(prev => ({
      ...prev,
      [name]: prev[name].includes(id)
        ? prev[name].filter(item => item !== id)
        : [...prev[name], id]
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Convert price to cents and prepare data
      const submitData = {
        ...formData,
        price: Math.round(parseFloat(formData.price) * 100), // Convert to cents
        organisation_id: parseInt(formData.organisation_id || '1') // Get from auth context
      };

      const token = localStorage.getItem('token'); // Adjust based on your auth setup
      const response = await fetch('/api/lessons/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Lesson created:', result);
      
      setSuccess(true);
      setFormData({
        date: '',
        time: '',
        location: '',
        price: '',
        teacher_ids: [],
        student_ids: [],
        organisation_id: formData.organisation_id
      });
      
    } catch (err) {
      setError(err.message || 'Failed to create lesson. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSelectedCount = (selectedIds, allItems) => {
    return selectedIds.length;
  };

  const getSelectedNames = (selectedIds, allItems) => {
    const selected = allItems.filter(item => selectedIds.includes(item.id));
    if (selected.length === 0) return 'None selected';
    if (selected.length === 1) return selected[0].name;
    if (selected.length <= 3) return selected.map(item => item.name).join(', ');
    return `${selected[0].name} and ${selected.length - 1} others`;
  };

  if (dataLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
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
        {/* Basic Information */}
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Lesson Details
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
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

        {/* Teachers Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Select Teachers
          </h2>
          <div className="text-sm text-gray-600 mb-2">
            {getSelectedCount(formData.teacher_ids, teachers)} selected: {getSelectedNames(formData.teacher_ids, teachers)}
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
              filteredTeachers.map(teacher => (
                <label key={teacher.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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

        {/* Students Selection */}
        <div className="space-y-4">
          <h2 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
            Select Students
          </h2>
          <div className="text-sm text-gray-600 mb-2">
            {getSelectedCount(formData.student_ids, students)} selected: {getSelectedNames(formData.student_ids, students)}
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
              filteredStudents.map(student => (
                <label key={student.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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

        {/* Submit Button */}
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
  );
};

export { LessonCreateForm };
export default LessonCreateForm;