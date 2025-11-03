// src/ui/AuthModal.jsx
import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../auth/AuthContext"
import { Brain, Users, LineChart } from "lucide-react"

export default function AuthModal({ open, onClose }) {
  const { login } = useAuth()
  const nav = useNavigate()
  const modalRef = useRef(null)

  const [mode, setMode] = useState("signup") // 'signup' | 'login'
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("student")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      // focus first input after open
      setTimeout(() => modalRef.current?.querySelector("input")?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  function backdropClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  function validateEmail(v) {
    return /\S+@\S+\.\S+/.test(v)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.")
      return
    }

    setLoading(true)
    try {
      // simulate backend latency
      await new Promise((r) => setTimeout(r, 450))

      const user = {
        name: name || email.split("@")[0],
        email,
        role,
      }

      login(user) // from AuthContext
      onClose?.()

      // route based on role
      if (role === "admin") nav("/admin")
      else nav("/student")
    } catch (err) {
      setError("Something went wrong — please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

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
        <div className="grid grid-cols-1 md:grid-cols-2 min-h-[420px]">
          {/* LEFT: Illustration / Brand (uses Lucide icons) */}
          <div className="hidden md:flex items-center justify-center p-8 bg-gradient-to-br from-indigo-600 via-purple-500 to-fuchsia-500 text-white">
            <div className="w-full max-w-md text-white">
              {/* Big Lucide Icon */}
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
                  onClick={() => setMode(mode === "signup" ? "login" : "signup")}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {mode === "signup" ? "Have an account? Log in" : "New? Create an account"}
                </button>

                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="text-slate-400 hover:text-slate-600 p-1 rounded"
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
                    setName("Demo User")
                    setEmail("demo@example.com")
                    setRole("student")
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
  )
}
