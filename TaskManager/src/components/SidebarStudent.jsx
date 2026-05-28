// src/components/SidebarStudent.jsx
import React, { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  FolderOpen,
  Trophy,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { useAuth } from "../auth/AuthContext"

export default function SidebarStudent() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const menuItems = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: "/student",
    },
    {
      id: "projects",
      label: "Projects",
      icon: <FolderOpen className="w-5 h-5" />,
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

  const sidebarContent = (
    <>
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg" />
          <h2 className="text-lg font-semibold text-slate-800">Student</h2>
        </div>
        <button
          className="md:hidden p-1 rounded-lg hover:bg-slate-100 transition"
          onClick={() => setMobileOpen(false)}
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === "/student"}
            onClick={() => setMobileOpen(false)}
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
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition"
        onClick={() => setMobileOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        {sidebarContent}
      </aside>
    </>
  )
}
