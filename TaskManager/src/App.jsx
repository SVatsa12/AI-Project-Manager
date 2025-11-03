// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudentsPage from "./pages/StudentsPage";
import ProjectsPage from "./pages/ProjectsPage"; // student’s old project page (kept for now if needed)
import AdminProjectsPage from "./pages/AdminProjectsPage"; // ✅ new admin-only projects page
import CompetitionsPage from "./pages/CompetitionsPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentProjectsPage from "./pages/StudentProjectsPage"; // ✅ student projects
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <Routes>
      {/* Public route */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* ================= ADMIN AREA ================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/students"
        element={
          <ProtectedRoute requiredRole="admin">
            <StudentsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ Admin-specific projects page */}
      <Route
        path="/admin/projects"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminProjectsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/competitions"
        element={
          <ProtectedRoute requiredRole="admin">
            <CompetitionsPage />
          </ProtectedRoute>
        }
      />

      {/* ================= STUDENT AREA ================= */}
      <Route
        path="/student"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ Student projects page */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute requiredRole="student">
            <StudentProjectsPage />
          </ProtectedRoute>
        }
      />

      {/* ✅ Leaderboard (student only) */}
      <Route
        path="/leaderboard"
        element={
          <ProtectedRoute requiredRole="student">
            <Leaderboard />
          </ProtectedRoute>
        }
      />

      {/* ✅ Settings (student only) */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute requiredRole="student">
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
