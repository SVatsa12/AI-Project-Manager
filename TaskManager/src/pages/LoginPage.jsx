import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext"; // matches your main.jsx import path

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth(); // use the AuthProvider login()
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [remember, setRemember] = useState(false);

  const validate = () => {
    if (!email) return "Email is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      // use login from context — it should save token & user into storage
      await login({ email, password, remember });
      navigate("/dashboard");
    } catch (err) {
      // login() throws an Error with message from apiFetch / server
      setError(err?.body?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role = "student") => {
    const demoCreds = {
      student: { email: "student@example.com", password: "password" },
      admin: { email: "admin@example.com", password: "password" },
    };
    setEmail(demoCreds[role].email);
    setPassword(demoCreds[role].password);
    // small delay then submit
    setTimeout(() => document.getElementById("login-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })), 120);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">GroupProject.AI</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </header>

        <form id="login-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

          <label className="block">
            <div className="flex items-center text-sm text-slate-600 mb-1">Email</div>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <Mail size={16} className="text-slate-400 mr-2" />
              <input
                className="flex-1 outline-none text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                type="email"
                autoComplete="email"
                aria-label="Email"
              />
            </div>
          </label>

          <label className="block">
            <div className="flex items-center text-sm text-slate-600 mb-1">Password</div>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <Lock size={16} className="text-slate-400 mr-2" />
              <input
                className="flex-1 outline-none text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                aria-label="Password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="ml-2" aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="w-4 h-4" />
              <span className="text-slate-600">Remember me</span>
            </label>
            <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm text-slate-500 hover:underline">Forgot?</button>
          </div>

          <div>
            <button disabled={loading} type="submit" className="w-full px-4 py-2 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-60">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>

          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-200" />
            <div className="text-xs text-slate-400">or</div>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleDemoLogin("student")} className="py-2 rounded-lg border text-sm">Demo Student</button>
            <button type="button" onClick={() => handleDemoLogin("admin")} className="py-2 rounded-lg border text-sm">Demo Admin</button>
          </div>

          <p className="text-center text-sm text-slate-500">Don't have an account? <button type="button" onClick={() => navigate("/signup")} className="text-sky-600 font-medium">Sign up</button></p>
        </form>

        <footer className="mt-6 text-xs text-slate-400 text-center">By signing in you agree to the project terms.</footer>
      </motion.div>
    </div>
  );
}
