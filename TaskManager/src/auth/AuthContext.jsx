// src/auth/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const AuthContext = createContext();

// Storage keys
const TOKEN_KEY = "gpa_token";
const USER_KEY = "gpa_user";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4003";




export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // helper: store token + user depending on remember flag
  const persistAuth = useCallback((tokenValue, userObj, remember = true) => {
    try {
      if (remember) {
        localStorage.setItem(TOKEN_KEY, tokenValue);
        localStorage.setItem(USER_KEY, JSON.stringify(userObj));
        // clear any sessionStorage variants
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, tokenValue);
        sessionStorage.setItem(USER_KEY, JSON.stringify(userObj));
        // clear any localStorage variants
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn("Storage not available:", e);
    }
    setToken(tokenValue);
    setUser(userObj);
  }, []);

  // login: expects { email, password, remember } from UI
  async function login({ email, password, remember = true }) {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!res.ok) {
        const message = data?.message || data?.error || res.statusText || "Login failed";
        const err = new Error(message);
        // attach body for callers that expect err.body.message
        err.body = data;
        throw err;
      }

      const { token: returnedToken, user: returnedUser } = data;
      if (!returnedToken) {
        throw new Error("No token returned from server");
      }

      // Save token & user
      persistAuth(returnedToken, returnedUser || {}, remember);

      return { token: returnedToken, user: returnedUser };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }

  // authFetch: a small fetch wrapper that attaches the token
  async function authFetch(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      ...options,
      headers,
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    if (!response.ok) {
      const err = new Error(body?.message || response.statusText || "Request failed");
      err.status = response.status;
      err.body = body;
      throw err;
    }

    return body;
  }

  // expose context
  const value = {
    user,
    token,
    loading,
    login,
    logout,
    authFetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
