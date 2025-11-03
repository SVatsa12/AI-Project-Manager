// src/pages/StudentsPage.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Search, Edit2, Trash2, UserCheck, UserX, MoreHorizontal, UploadCloud } from "lucide-react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"

// Reads/writes the same storage key used by AdminDashboard
const STORAGE_KEY = "gp_state_v1"
function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { projects: [], competitions: [] }
    return JSON.parse(raw)
  } catch {
    return { projects: [], competitions: [] }
  }
}
function writeState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export default function StudentsPage() {
  const [gpState, setGpState] = useState(() => readState())
  useEffect(() => writeState(gpState), [gpState])

  const [query, setQuery] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [statusFilter, setStatusFilter] = useState("") // active / disabled / all
  const [page, setPage] = useState(1)
  const perPage = 8

  const students = useMemo(() => {
    const map = {}
    gpState.projects.forEach((p) => {
      (p.members || []).forEach((m) => {
        if (!map[m]) map[m] = { id: m, name: m.split("@")[0], email: m, role: "student", projects: new Set(), active: true }
        map[m].projects.add(p.id)
      })
      ;(p.tasks || []).forEach((t) => {
        if (t.assignee && !map[t.assignee]) map[t.assignee] = { id: t.assignee, name: t.assignee.split("@")[0], email: t.assignee, role: "student", projects: new Set(), active: true }
      })
    })
    return Object.values(map).map((s) => ({ ...s, projects: Array.from(s.projects) }))
  }, [gpState.projects])

  const filtered = useMemo(() => {
    let arr = students
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q))
    }
    if (filterProject) arr = arr.filter((s) => (s.projects || []).includes(filterProject))
    if (statusFilter === "disabled") arr = arr.filter((s) => !s.active)
    if (statusFilter === "active") arr = arr.filter((s) => s.active)
    return arr
  }, [students, query, filterProject, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage)

  function projectName(id) {
    const p = gpState.projects.find((x) => x.id === id)
    return p ? p.title : id
  }

  function toggleStudentActive(email) {
    const overrides = gpState._studentOverrides || {}
    overrides[email] = { ...(overrides[email] || {}), active: !((overrides[email] && overrides[email].active) ?? true) }
    setGpState((s) => ({ ...s, _studentOverrides: overrides }))
  }

  function impersonate(email) {
    alert(`Impersonation stub: now impersonating ${email} (demo)`)
  }

  function editStudent(email) {
    alert(`Edit student ${email} - implement UI`)
  }

  function removeFromAllProjects(email) {
    if (!confirm(`Remove ${email} from all projects? This will delete their membership (demo).`)) return
    setGpState((prev) => ({ ...prev, projects: prev.projects.map((p) => ({ ...p, members: (p.members || []).filter((m) => m !== email) })) }))
  }

 return (
  /* ====== Full-width colored glossy background ====== */
  <div className="students-page-bg">
    {/* Centered page content area */}
    <div className="p-8 max-w-7xl mx-auto students-page">

      {/* ---------- Header section ---------- */}
      <div className="flex items-start justify-between mb-6 gap-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Students</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage enrolled users, their projects, and participation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ImportCsvButton
            onImport={(newStudents) => {
              setGpState((prev) => {
                const next = { ...prev }
                newStudents.forEach((s) => {
                  (s.projects || []).forEach((pTitle) => {
                    let p = next.projects.find((x) => x.title === pTitle)
                    if (!p) {
                      p = {
                        id: `p${Date.now()}${Math.random()}`,
                        title: pTitle,
                        description: "Imported",
                        deadline: "",
                        members: [],
                        tasks: [],
                      }
                      next.projects = [p, ...(next.projects || [])]
                    }
                    if (!p.members.includes(s.email)) p.members.push(s.email)
                  })
                })
                return next
              })
            }}
          />

          {/* Search box */}
          <div className="flex items-center rounded-lg border bg-white px-3 py-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="Search by name or email"
              className="outline-none text-sm w-64 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>

      {/* ---------- Main white card ---------- */}
      <div className="students-card p-4 rounded-2xl">
        {/* Filters row */}
        <div className="flex items-center gap-4 mb-4">
          {/* Filter by project */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Filter by project</label>
            <select
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value)
                setPage(1)
              }}
              className="ml-2 px-3 py-2 border rounded-lg bg-white text-sm shadow-inner"
            >
              <option value="">All projects</option>
              {gpState.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by status */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="ml-2 px-3 py-2 border rounded-lg bg-white text-sm shadow-inner"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-slate-500">
            Showing {filtered.length} students
          </div>
        </div>

        {/* ---------- Table ---------- */}
        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-sm border-separate"
            style={{ borderSpacing: 0 }}
          >
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="py-3 pl-4">Name</th>
                <th>Projects</th>
                <th className="text-center">Assigned Tasks</th>
                <th className="text-center">Completed %</th>
                <th className="text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => (
                <StudentRow
                  key={s.email || s.id}
                  student={s}
                  gpState={gpState}
                  onToggleActive={toggleStudentActive}
                  onImpersonate={impersonate}
                  onEdit={editStudent}
                  onRemove={removeFromAllProjects}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* ---------- Pagination ---------- */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 bg-white text-sm"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 border rounded-lg disabled:opacity-50 bg-white text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>
      {/* End white card */}

    </div>
    {/* End centered page content */}
  </div>
  /* End glossy background */
)

}

/* ===== subcomponents ===== */

function StudentRow({ student, gpState, onToggleActive, onImpersonate, onEdit, onRemove }) {
  const [open, setOpen] = useState(false)

  const assignedTasks = useMemo(() => {
    const tasks = []
    gpState.projects.forEach((p) => {
      ;(p.tasks || []).forEach((t) => {
        if (t.assignee === student.email) tasks.push({ ...t, projectTitle: p.title })
      })
    })
    return tasks
  }, [gpState, student.email])

  const completedPct = useMemo(() => {
    if (!assignedTasks.length) return 0
    const done = assignedTasks.filter((t) => t.status === "done").length
    return Math.round((done / assignedTasks.length) * 100)
  }, [assignedTasks])

  return (
    <>
      <motion.tr layout className="hover:bg-slate-50">
        <td className="py-4 pl-4 align-top">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">{(student.name || "?")[0]?.toUpperCase()}</div>
            <div>
              <div className="font-medium text-slate-800">{student.name}</div>
              <div className="text-xs text-slate-400">{student.email}</div>
            </div>
          </div>
        </td>
        <td className="align-top">
          <div className="text-sm text-slate-600">{(student.projects || []).slice(0, 3).map((id) => gpState.projects.find((p) => p.id === id)?.title || id).join(", ") || "—"}</div>
        </td>
        <td className="text-center align-top">
          <div className="text-sm text-slate-600">{assignedTasks.length}</div>
        </td>
        <td className="text-center align-top">
          <div className="text-sm text-slate-600">{completedPct}%</div>
        </td>
        <td className="text-right pr-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setOpen(true)} className="p-2 rounded-lg border hover:bg-slate-50 transition"><MoreHorizontal /></button>
          </div>
        </td>
      </motion.tr>

      {open && <StudentDetailDrawer student={student} assignedTasks={assignedTasks} onClose={() => setOpen(false)} onToggleActive={() => onToggleActive(student.email)} onImpersonate={() => onImpersonate(student.email)} onEdit={() => onEdit(student.email)} onRemove={() => onRemove(student.email)} />}
    </>
  )
}
function StudentDetailDrawer({
  student,
  assignedTasks,
  onClose,
  onToggleActive,
  onImpersonate,
  onEdit,
  onRemove,
}) {
  if (typeof document === "undefined") return null

  const drawer = (
    <div className="fixed inset-0 z-50 flex">
      {/* Transparent overlay to close when clicking outside */}
      <div
        className="absolute inset-0 bg-transparent cursor-default"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="StudentDetailDrawer p-6 relative"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mt-2">
          <div className="student-info">
            <div className="student-avatar">
              {(student.name || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-800">
                {student.name}
              </div>
              <div className="text-sm text-slate-500">{student.email}</div>
            </div>
          </div>

          <div className="ml-auto flex gap-2">
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-slate-50 transition"
              onClick={onEdit}
            >
              <Edit2 className="w-4 h-4 inline mr-1" /> Edit
            </button>
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-slate-50 transition"
              onClick={onToggleActive}
            >
              <UserX className="w-4 h-4 inline mr-1" /> Toggle
            </button>
          </div>
        </div>

        {/* Assigned Tasks */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-700">Assigned tasks</h4>
          <div className="mt-2 space-y-2">
            {assignedTasks.length === 0 && (
              <div className="text-sm text-slate-500">No tasks assigned</div>
            )}
            {assignedTasks.map((t) => (
              <div key={t.id} className="task-card">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {t.title}
                  </div>
                  <div className="text-xs text-slate-400">{t.projectTitle}</div>
                </div>
                <div className="text-xs text-slate-500">{t.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* History Section */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-slate-700">
            History & Activity
          </h4>
          <div className="text-xs text-slate-400 mt-2">
            (placeholder activity feed)
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onImpersonate}
            className="footer-btn primary"
          >
            Impersonate
          </button>
          <button
            onClick={onRemove}
            className="footer-btn secondary border"
          >
            Remove from projects
          </button>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(drawer, document.body)
}





function ImportCsvButton({ onImport }) {
  const fileRef = React.useRef(null)

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const parsed = simpleCsvParse(text)
      const rows = parsed.map((r) => ({ email: r.email || r.Email || r.email_address, name: r.name || r.Name || r.fullname, projects: (r.projects || r.Projects || "").split(";").map((s) => s.trim()).filter(Boolean) }))
      onImport(rows)
      if (fileRef.current) fileRef.current.value = null
      alert(`${rows.length} rows imported (demo)`)
    }
    reader.readAsText(f)
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="text/csv" onChange={handleFile} className="hidden" />
      <button onClick={() => fileRef.current && fileRef.current.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-white shadow-sm hover:shadow-md transition">
        <UploadCloud className="w-4 h-4 text-slate-600" />
        <span className="text-sm">Import CSV</span>
      </button>
    </>
  )
}

// tiny CSV parser for simple CSVs
function simpleCsvParse(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((ln) => {
    const cols = ln.split(",")
    const obj = {}
    header.forEach((h, i) => (obj[h] = (cols[i] || "").trim()))
    return obj
  })
}
