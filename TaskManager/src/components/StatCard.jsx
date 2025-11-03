// src/components/StatCard.jsx
import React from "react"

/**
 * StatCard
 * Small presentational card used on the dashboard header.
 * Props:
 *  - label: string
 *  - value: string | number
 *  - icon: React node (already styled in parent)
 */
export default function StatCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 min-w-[200px]">
      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-inner">
        {icon}
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  )
}
