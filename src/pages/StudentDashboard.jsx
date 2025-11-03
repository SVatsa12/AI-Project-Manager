// src/pages/StudentDashboard.jsx
import React from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"
import { CheckCircle, Brain, ClipboardList, Zap } from "lucide-react"

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== "student") {
    navigate("/") // redirect unauthorized users
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-indigo-50 to-purple-50">
      {/* Top navbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
        <h1 className="text-xl font-semibold text-indigo-700">GroupProject.AI</h1>
        <div className="flex items-center gap-4">
          <span className="text-slate-700 text-sm">{user.email}</span>
          <button
            onClick={logout}
            className="text-sm text-slate-600 hover:text-red-500 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-8 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-slate-800 mb-6">
          Hi, {user.name || "Student"} 👋
        </h2>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <Card
            icon={<ClipboardList size={22} />}
            title="Current Project"
            value="AI Research on Task Fairness"
            color="from-indigo-500 to-purple-500"
          />
          <Card
            icon={<CheckCircle size={22} />}
            title="Tasks Completed"
            value="7 / 10"
            color="from-green-500 to-emerald-400"
          />
          <Card
            icon={<Brain size={22} />}
            title="Fairness Index"
            value="89%"
            color="from-fuchsia-500 to-purple-500"
          />
        </div>

        {/* Progress section */}
        <section className="bg-white/90 backdrop-blur-md border border-white/50 rounded-2xl shadow-sm p-6 mb-8">
          <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-600" /> Your Tasks
          </h3>

          <ul className="divide-y divide-slate-200">
            {[
              { task: "Draft literature review", done: true },
              { task: "Add AI fairness metrics", done: false },
              { task: "Submit interim report", done: false },
              { task: "Update project dashboard", done: true },
            ].map((t, i) => (
              <li key={i} className="py-3 flex items-center justify-between">
                <span
                  className={`text-slate-700 ${
                    t.done ? "line-through text-slate-400" : ""
                  }`}
                >
                  {t.task}
                </span>
                {t.done ? (
                  <CheckCircle className="text-green-500" size={18} />
                ) : (
                  <div className="w-4 h-4 border border-slate-400 rounded-full" />
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* AI suggestions */}
        <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-6 shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <Zap size={20} className="text-white/90" />
            <h3 className="text-lg font-semibold">AI Suggestion</h3>
          </div>
          <p className="text-white/90">
            Based on your progress, the AI recommends prioritizing the “fairness metrics” section.
            Completing it early improves your overall balance score by 7%.
          </p>
          <button className="mt-4 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-medium transition">
            Apply Suggestion
          </button>
        </section>
      </main>
    </div>
  )
}

function Card({ icon, title, value, color }) {
  return (
    <div className="bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl p-6 shadow-sm flex items-center gap-4">
      <div
        className={`p-3 rounded-xl text-white bg-gradient-to-br ${color} shadow`}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-600">{title}</p>
        <p className="text-lg font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
