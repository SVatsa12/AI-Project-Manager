// src/components/Navbar.jsx
import React from "react"
import { LogOut } from "lucide-react"

export default function Navbar({ user, onLogout }) {
  return (
    <header className="flex items-center justify-between bg-white/75 backdrop-blur-md p-4 border-b border-white/60 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="text-lg font-semibold text-slate-800">GroupProject.AI</div>
        <div className="hidden sm:flex items-center text-sm text-slate-500">Fair task distribution · Demo</div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-700 hidden sm:block">{user?.email}</div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border hover:bg-red-50 text-sm text-slate-700"
          title="Logout"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </header>
  )
}
