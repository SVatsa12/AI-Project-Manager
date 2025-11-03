// src/components/AllocationModal.jsx
import React, { useState } from "react"
import { motion } from "framer-motion"
import { X, Check, UserPlus } from "lucide-react"

export default function AllocationModal({ open, onClose, projectId, projectName, projectSkills, onAssigned }) {
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState([])
  const [error, setError] = useState(null)
  const [persisting, setPersisting] = useState(false)

  async function runAllocate(persist = false) {
    setLoading(true)
    setError(null)
    try {
      const body = projectId ? { projectId, teamSize: 3, persist } : { projectSkills, teamSize: 3, persist }
      const res = await fetch("/api/allocator/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || "Allocate failed")
      setCandidates(json.result.candidates || [])
      if (persist) {
        setPersisting(true)
        // small delay to reflect persisted state; call onAssigned callback so parent can refresh
        onAssigned && onAssigned(json.result)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setPersisting(false)
    }
  }

  // auto-run allocate when modal opens (non-persist)
  React.useEffect(() => {
    if (open) {
      runAllocate(false)
    } else {
      setCandidates([])
      setError(null)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white rounded-2xl p-6 shadow-xl w-[720px] max-w-[95%]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Auto-assign: {projectName || "Project"}</h3>
            <div className="text-sm text-slate-500 mt-1">Skills: {(projectSkills || []).join(", ")}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="mt-4 space-y-3">
          {loading && <div className="text-sm text-slate-500">Searching candidates…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}

          {!loading && candidates.length === 0 && <div className="text-sm text-slate-500">No suitable candidates found.</div>}

          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.userId} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{c.name} <span className="text-xs text-slate-400">({c.experienceLevel})</span></div>
                  <div className="text-xs text-slate-500 mt-1">Matched: {c.matchedRequired.join(", ") || "—"} • Coverage: {(c.coverage*100).toFixed(0)}%</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{(c.compositeScore || 0).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button onClick={() => runAllocate(false)} className="px-3 py-2 border rounded text-sm">Refresh</button>
            <button
              onClick={() => runAllocate(true)}
              disabled={persisting || candidates.length === 0}
              className="px-4 py-2 rounded bg-indigo-600 text-white flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> Confirm & Assign
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
