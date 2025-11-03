import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./../auth/AuthContext"; // adjust if your AuthContext path differs

/**
 * Props:
 *  - children: react node
 *  - requiredRole: optional string e.g. "admin" or "student"
 *
 * Behavior:
 *  - If not authenticated, redirects to /login
 *  - If authenticated but doesn't have requiredRole, redirects to / (or /login)
 */
export default function ProtectedRoute({ children, requiredRole = null }) {
  const { token, user } = useAuth();

  if (!token) {
    // not logged in
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && (!user || user.role !== requiredRole)) {
    // logged in but wrong role — redirect to home or a "not authorized" page
    return <Navigate to="/" replace />;
  }

  return children;
}
