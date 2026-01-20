// src/App.jsx
import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AuthPage } from './components/auth/AuthPage';
import { HomePage } from './components/pages/HomePage';
import LessonCreateForm from './components/pages/CreateLesson'; // default export
import CalendarPage from './components/pages/CalendarPage'; // ✅ add this

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
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
