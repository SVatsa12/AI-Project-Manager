// src/ui/AuthModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Brain, Users, LineChart, Eye, EyeOff } from "lucide-react";

export default function AuthModal({ open, onClose, mode: externalMode = null }) {
  const { login } = useAuth();
  const nav = useNavigate();
  const modalRef = useRef(null);

  // internal mode state but allow parent to override via `externalMode`
  const [mode, setMode] = useState(externalMode || "signup"); // 'signup' | 'login'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4003";

  // Sync internal mode when parent supplies externalMode
  useEffect(() => {
    if (externalMode) {
      const newMode = externalMode === "login" ? "login" : "signup";
      setMode(newMode);
      setError(""); // clear errors when mode changes externally
    }
  }, [externalMode]);

  useEffect(() => {
    if (open) {
      // focus first input after open
      setTimeout(() => modalRef.current?.querySelector("input")?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function backdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  function validateEmail(v) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function handleSignup() {
    // basic validations
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!name.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.message || `Signup failed (${res.status})`;
        setError(msg);
        return false;
      }

      // if backend returned token/user directly, use it — otherwise auto-login
      if (data?.token) {
        // if backend returned token, we call login to store it or directly set storage depending on your AuthContext.
        try {
          await login({ email, password, remember: true });
        } catch (err) {
          // if login fails after signup, still redirect to login page
          console.warn("Auto-login failed after signup:", err);
          nav("/login");
          return true;
        }
      } else {
        // try auto-login (common case)
        try {
          await login({ email, password, remember: true });
        } catch (err) {
          console.warn("Auto-login failed after signup:", err);
          nav("/login");
          return true;
        }
      }

      // success: close modal and redirect to role area
      onClose?.();
      if (role === "admin") nav("/admin");
      else nav("/student");
      return true;
    } catch (e) {
      console.error("Signup error", e);
      setError("Something went wrong — please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin() {
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return false;
    }
    if (!password) {
      setError("Please enter your password.");
      return false;
    }

    setLoading(true);
    setError("");
    try {
      // use AuthContext login — it should handle storing token & user
      await login({ email, password, remember: true });
      onClose?.();
      // redirect based on role in stored user
      const storedUser = (() => {
        try {
          return JSON.parse(localStorage.getItem("gpa_user") || "null");
        } catch {
          return null;
        }
      })();

      if (storedUser?.role === "admin") nav("/admin");
      else nav("/student");
      return true;
    } catch (err) {
      console.warn("Login failed", err);
      // If your AuthContext throws Error with .body.message, try to read it
      const msg = err?.body?.message || err?.message || "Invalid credentials";
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (mode === "signup") {
      await handleSignup();
    } else {
      await handleLogin();
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onMouseDown={backdropClick}
      aria-modal="true"
      role="dialog"
      aria-label={mode === "signup" ? "Create account" : "Sign in"}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-5xl bg-transparent rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Split screen container */}
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[480px]">
          {/* LEFT: Illustration / Brand */}
          <div className="hidden md:flex items-center justify-center p-8 bg-gradient-to-br from-indigo-600 via-purple-500 to-fuchsia-500 text-white">
            <div className="w-full max-w-md text-white">
              <div className="flex justify-center mb-6">
                <div className="bg-white/15 backdrop-blur-md rounded-full p-6 shadow-2xl">
                  <Brain size={72} strokeWidth={1.6} />
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-2">Welcome to GroupProject.AI</h3>
              <p className="text-white/90 mb-6">
                Fair task distribution, clear contribution tracking, and instructor-ready reports —
                all powered by AI. Create an account to get a personalized project dashboard.
              </p>

              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Users size={18} strokeWidth={1.8} className="text-white/90" />
                  <span>Smart allocation by skills & availability</span>
                </div>
                <div className="flex items-center gap-3">
                  <LineChart size={18} strokeWidth={1.8} className="text-white/90" />
                  <span>Automated fairness index</span>
                </div>
                <div className="flex items-center gap-3">
                  <Brain size={18} strokeWidth={1.8} className="text-white/90" />
                  <span>Exportable teacher-ready reports</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Form */}
          <div className="bg-white p-6 md:p-10">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {mode === "signup" ? "Create an account" : "Sign in"}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {mode === "signup" ? "Join your team and start a project." : "Sign in to continue to your dashboard."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMode((m) => (m === "signup" ? "login" : "signup"));
                    setError("");
                  }}
                  className="text-sm text-indigo-600 hover:underline"
                  type="button"
                >
                  {mode === "signup" ? "Have an account? Log in" : "New? Create an account"}
                </button>

                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="Your full name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="you@university.edu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-600 mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="student">Student</option>
                  <option value="admin">Admin / Instructor</option>
                </select>
              </div>

              {/* PASSWORD (visible for login and signup) */}
              <div>
                <label className="block text-sm text-slate-600 mb-1">Password</label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
                    type={showPassword ? "text" : "password"}
                    className="flex-1 outline-none text-sm"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="ml-2 p-1 text-slate-500"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm password only for signup */}
              {mode === "signup" && (
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Confirm password</label>
                  <div className="flex items-center border rounded-lg px-3 py-2">
                    <input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      type={showPassword ? "text" : "password"}
                      className="flex-1 outline-none text-sm"
                      autoComplete="new-password"
                      required
                    />
                    <div className="ml-2 text-slate-400 text-sm"> </div>
                  </div>
                </div>
              )}

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="mt-2 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow"
                >
                  {loading ? (mode === "signup" ? "Creating..." : "Signing in...") : (mode === "signup" ? "Create account" : "Sign in")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setName("Demo User");
                    setEmail("student@example.com");
                    setRole("student");
                    setPassword("password");
                    setConfirmPassword("password");
                    if (mode === "login") {
                      // auto-submit for login mode
                      setTimeout(() => modalRef.current?.querySelector("form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })), 120);
                    }
                  }}
                  className="px-3 py-3 rounded-lg border text-sm"
                >
                  Autofill demo
                </button>
              </div>
            </form>

            <div className="mt-6 text-xs text-slate-500">
              By continuing you agree to our <a className="underline">Terms</a> and <a className="underline">Privacy</a>.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
