// src/components/Sidebar.jsx
import React from "react"
import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users, BookOpen, BarChart3, Settings } from "lucide-react"

const items = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/admin/students", label: "Students", icon: <Users size={18} /> },
  { to: "/admin/projects", label: "Projects", icon: <BookOpen size={18} /> },
  { to: "/admin/competitions", label: "Competitions", icon: <BarChart3 size={18} /> },
  { to: "/admin/settings", label: "Settings", icon: <Settings size={18} /> },
]

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 bg-white/90 backdrop-blur-md border-r border-white/60 p-6 gap-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">GP</div>
        <div>
          <div className="text-lg font-bold text-indigo-600">Admin Panel</div>
          <div className="text-xs text-slate-500">GroupProject.AI</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1" aria-label="Main">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-slate-700 hover:bg-indigo-50 ${
                isActive ? "bg-indigo-50 font-medium ring-1 ring-indigo-200" : ""
              }`
            }
          >
            <div className="text-indigo-600">{it.icon}</div>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="text-xs text-slate-400 mt-auto">v0.1 · Demo mode</div>
    </aside>
  )
}
