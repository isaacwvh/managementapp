// src/App.jsx
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './components/auth/AuthPage';
import { HomePage } from './components/pages/HomePage';
import LessonCreateForm from './components/pages/CreateLesson'; // default export
import CalendarPage from './components/pages/CalendarPage'; // ✅ add this
import LessonDetailPage from './components/pages/LessonDetailPage.jsx';
import ManageLessonsPage from './components/pages/ManageLessonsPage.jsx';
import TeacherAnalyticsPage from './components/pages/TeacherAnalyticsPage.jsx';
import ManageStudentLessonsPage from './components/pages/ManageStudentLessonsPage.jsx';
import StudentHomePage from './components/pages/StudentHomePage.jsx';
import ProfilePage from './components/pages/ProfilePage.jsx';
import AdminManageStudentsPage from './components/pages/AdminManageStudentsPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          <Route path="/login" element={<AuthPage />} />

          <Route
            path="/create-lesson"
            element={
              <ProtectedRoute>
                <LessonCreateForm />
              </ProtectedRoute>
            }
          />

          {/* ✅ Calendar route */}
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <CalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" replace />} />

          <Route path="/lessons/:lessonId" element={<LessonDetailPage />} />
          <Route path="/manage-lessons" element={<ManageLessonsPage />} />
          <Route path="/analytics" element={<TeacherAnalyticsPage />} />
          <Route path="/student/manage-lessons" element={<ManageStudentLessonsPage />} />
          <Route path="/student" element={<StudentHomePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/students" element={<AdminManageStudentsPage />} />
          {/* <Route path="/admin/students/:studentId" element={<AdminManageStudentPage />} /> */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
