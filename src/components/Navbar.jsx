// src/components/Navbar.jsx
import React from "react"
import { LogOut } from "lucide-react"

export default function Navbar({ user, onLogout }) {
  return (
    <header className="flex items-center justify-between bg-white/80 backdrop-blur-md p-4 border-b border-white/50 shadow-sm">
      <h1 className="text-lg font-semibold text-slate-700">GroupProject.AI</h1>
      <div className="flex items-center gap-4">
        <span className="text-slate-700 text-sm">{user.email}</span>
        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-red-500 transition"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  )
}
