import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext"; // optional auto-login

export default function SignupPage() {
  const navigate = useNavigate();
  const auth = useAuth(); // may be used to auto-login after signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("student");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4003";

  const validate = () => {
    if (!name) return "Name is required.";
    if (!email) return "Email is required.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Enter a valid email.";
    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (password !== confirm) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || `Signup failed (${res.status})`);
      }

      // success
      // If AuthContext exposes login(), auto-login and redirect to role area
      if (auth && typeof auth.login === "function") {
        try {
          await auth.login({ email, password, remember: true });
          // redirect based on role if available
          const user = JSON.parse(localStorage.getItem("gpa_user") || "null");
          if (user?.role === "admin") navigate("/admin");
          else navigate("/student");
          return;
        } catch (autoLoginErr) {
          // fall through to redirect to login
          console.warn("Auto-login failed after signup:", autoLoginErr);
        }
      }

      // otherwise redirect to login with success query param
      navigate("/login?signup=success");
    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white p-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="text-sm text-slate-500 mt-1">Sign up to get started with GroupProject.AI</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>}

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Full name</div>
            <div className="border rounded-lg px-3 py-2">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full outline-none text-sm" />
            </div>
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Email</div>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <Mail size={16} className="text-slate-400 mr-2" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" type="email" className="flex-1 outline-none text-sm" />
            </div>
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Role</div>
            <div className="border rounded-lg px-3 py-2">
              <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full outline-none text-sm bg-transparent">
                <option value="student">Student</option>
                <option value="admin">Instructor / Admin</option>
              </select>
            </div>
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Password</div>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <Lock size={16} className="text-slate-400 mr-2" />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                type={showPassword ? "text" : "password"}
                className="flex-1 outline-none text-sm"
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="ml-2" aria-label="Toggle password visibility">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <label className="block">
            <div className="text-sm text-slate-600 mb-1">Confirm password</div>
            <div className="flex items-center border rounded-lg px-3 py-2">
              <Lock size={16} className="text-slate-400 mr-2" />
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the password"
                type={showPassword ? "text" : "password"}
                className="flex-1 outline-none text-sm"
                autoComplete="new-password"
              />
            </div>
          </label>

          <div>
            <button disabled={loading} type="submit" className="w-full px-4 py-2 rounded-lg bg-sky-600 text-white font-medium disabled:opacity-60">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <p className="text-center text-sm text-slate-500">Already have an account? <button type="button" onClick={() => navigate("/login")} className="text-sky-600 font-medium">Sign in</button></p>
        </form>

        <footer className="mt-6 text-xs text-slate-400 text-center">By creating an account you agree to our Terms and Privacy.</footer>
      </motion.div>
    </div>
  );
}
