// src/components/SidebarStudent.jsx
import React from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Trophy,
  Settings,
  LogOut,
} from "lucide-react"
import { useAuth } from "../auth/AuthContext"

export default function SidebarStudent() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      // <--- point this to /student so it matches your App.jsx route
      path: "/student",
    },
    {
      id: "projects",
      label: "Projects",
      icon: <FolderOpen className="w-5 h-5" />,
      // keeping this as top-level /projects to match your existing App.jsx
      path: "/projects",
    },
      {
    id: "leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="w-5 h-5" />,
    path: "/leaderboard",
  },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings className="w-5 h-5" />,
      path: "/settings",
    },

  ]

  const handleLogout = () => {
    logout()
    navigate("/")
  }

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-200 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
        <h2 className="text-lg font-semibold text-slate-800">Student</h2>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            // use 'end' for the Dashboard link to avoid matching subpaths when needed
            end={item.path === "/student"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-xl transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`
            }
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full text-slate-600 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </aside>
  )
}
