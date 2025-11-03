// src/components/Sidebar.jsx
import React from "react"
import { LayoutDashboard, Users, BookOpen, BarChart3, Settings } from "lucide-react"

export default function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-md border-r border-white/60 p-6 shadow-sm">
      <div className="text-2xl font-bold text-indigo-600 mb-10">Admin Panel</div>

      <nav className="space-y-3">
        {[
          { icon: <LayoutDashboard size={18} />, label: "Dashboard" },
          { icon: <Users size={18} />, label: "Students" },
          { icon: <BookOpen size={18} />, label: "Projects" },
          { icon: <BarChart3 size={18} />, label: "Reports" },
          { icon: <Settings size={18} />, label: "Settings" },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-700 font-medium transition"
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}
