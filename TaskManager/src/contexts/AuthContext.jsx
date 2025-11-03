// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gpa_user')) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    return localStorage.getItem('gpa_token') || sessionStorage.getItem('gpa_token') || null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // keep token state in sync if set externally
    const t = localStorage.getItem('gpa_token') || sessionStorage.getItem('gpa_token') || null;
    if (t !== token) setToken(t);
  }, [token]);

  const login = async ({ email, password, remember }) => {
    setLoading(true);
    try {
      const body = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      const { token: returnedToken, user: returnedUser } = body;
      if (!returnedToken) throw new Error('No token received from server');

      try {
        if (remember) localStorage.setItem('gpa_token', returnedToken);
        else sessionStorage.setItem('gpa_token', returnedToken);
      } catch (err) { console.warn('Storage failed', err); }

      if (returnedUser) {
        try { localStorage.setItem('gpa_user', JSON.stringify(returnedUser)); } catch {}
      }

      setToken(returnedToken);
      setUser(returnedUser || null);
      setLoading(false);
      return { token: returnedToken, user: returnedUser };
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    try { localStorage.removeItem('gpa_token'); localStorage.removeItem('gpa_user'); } catch {}
    try { sessionStorage.removeItem('gpa_token'); } catch {}
    setToken(null);
    setUser(null);
  };

  // convenience: fetch protected resource with auth
  const authFetch = (path, opts) => apiFetch(path, opts);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
