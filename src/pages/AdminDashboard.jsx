// src/pages/AdminDashboard.jsx
import React from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Navbar from "../components/Navbar"
import { Users, BookOpen, BarChart2, Brain } from "lucide-react"

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== "admin") {
    navigate("/") // redirect unauthorized users
    return null
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <Navbar user={user} onLogout={logout} />

        {/* Page content */}
        <main className="p-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-8">
            Welcome, {user.name || "Admin"}
          </h1>

          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card icon={<Users />} title="Active Students" value="124" />
            <Card icon={<BookOpen />} title="Projects Created" value="18" />
            <Card icon={<BarChart2 />} title="Average Fairness Index" value="92%" />
            <Card icon={<Brain />} title="AI Suggestions Used" value="47" />
          </div>

          {/* Section: AI Insights */}
          <section className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-white/60">
            <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
              <Brain size={18} className="text-purple-600" /> AI Insights
            </h2>
            <p className="text-slate-600 leading-relaxed">
              The AI suggests redistributing workload for 2 groups where team balance dropped below 70%.
              Overall, fairness trends are stable across all student teams.
            </p>

            <button className="mt-5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium shadow-md hover:from-indigo-600 hover:to-purple-700 transition">
              Review AI Suggestions
            </button>
          </section>
        </main>
      </div>
    </div>
  )
}

function Card({ icon, title, value }) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-3">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-600">{title}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}
