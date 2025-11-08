// src/pages/StudentsPage.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Search, Edit2, Trash2, UserX, MoreHorizontal, UploadCloud, PlusCircle } from "lucide-react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { io } from "socket.io-client"

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

/* ===== Backend detection (works in Vite / CRA / fallback) ===== */
const BACKEND_API = (() => {
  try {
    // Vite
    if (typeof import.meta !== "undefined" && import.meta && import.meta.env && import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL
    }
  } catch { }
  // CRA
  if (typeof process !== "undefined" && process.env && process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL
  }
  // fallback
  return "http://localhost:4003"
})()

/* ===== AddStudentModal (used to create student via backend) ===== */
function AddStudentModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: "", email: "", skills: "" })
  function change(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }
  async function submit(e) {
    e.preventDefault()
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
      role: "student",
    }
    await onAdd(payload)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add Student</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Name</label>
            <input name="name" value={form.name} onChange={change} required className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Email (Gmail)</label>
            <input name="email" type="email" value={form.email} onChange={change} required className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Skills (comma separated)</label>
            <input name="skills" value={form.skills} onChange={change} className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg">Add</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===== Main page (keeps your gpState-driven students) ===== */
export default function StudentsPage() {
  const [gpState, setGpState] = useState(() => readState())
  useEffect(() => writeState(gpState), [gpState])

  // local UI state
  const [query, setQuery] = useState("")
  const [filterProject, setFilterProject] = useState("")
  const [statusFilter, setStatusFilter] = useState("") // active / disabled / all
  const [page, setPage] = useState(1)
  const perPage = 8

  // backend students (optional)
  const [remoteStudents, setRemoteStudents] = useState([])
  const [loadingRemote, setLoadingRemote] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    // socket to listen for server-side changes (if available)
    let socket = null
    try {
      socket = io(BACKEND_API, { path: "/socket.io", transports: ["websocket", "polling"] })
      socket.on("connect", () => console.info("[StudentsPage] socket connected", socket.id))
      socket.on("students:updated", () => {
        fetchRemoteStudents()
      })
      socket.on("disconnect", () => console.info("[StudentsPage] socket disconnected"))
    } catch (e) {
      // ignore if socket fails
    }
    // load initial remote students
    fetchRemoteStudents()
    return () => {
      if (socket) socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchRemoteStudents() {
    setLoadingRemote(true)
    try {
      const res = await fetch(`${BACKEND_API}/api/students`)
      if (!res.ok) {
        // server may not exist; treat as no remote students
        setRemoteStudents([])
        return
      }
      const json = await res.json()
      const arr = Array.isArray(json) ? json : (json.items || json.data || [])
      // normalize minimal fields
      const normalized = arr.map(u => ({
        id: u._id || u.id || u.email,
        name: u.name || (u.email ? u.email.split("@")[0] : ""),
        email: u.email,
        skills: Array.isArray(u.skills) ? u.skills : (typeof u.skills === "string" ? u.skills.split(",").map(s => s.trim()).filter(Boolean) : []),
        profile: u.profile || {},
        createdAt: u.createdAt || u.created_at || null,
        role: u.role || "student"
      }))
      setRemoteStudents(normalized)
    } catch (e) {
      console.error("fetchRemoteStudents error", e)
      setRemoteStudents([])
    } finally {
      setLoadingRemote(false)
    }
  }

  // Merge gpState-derived students with remote students: remote wins on matching email
  const students = useMemo(() => {
    // build students from gpState.projects (existing logic)
    const map = {}
      ; (gpState.projects || []).forEach((p) => {
        ; (p.members || []).forEach((m) => {
          if (!map[m]) map[m] = { id: m, name: m.split("@")[0], email: m, role: "student", projects: new Set(), skills: [] }
          map[m].projects.add(p.id)
        })
          ; (p.tasks || []).forEach((t) => {
            if (t.assignee && !map[t.assignee]) map[t.assignee] = { id: t.assignee, name: t.assignee.split("@")[0], email: t.assignee, role: "student", projects: new Set(), skills: [] }
          })
      })
    const gpArr = Object.values(map).map((s) => ({ ...s, projects: Array.from(s.projects) }))

    // index remote by email for merging
    const remoteIndex = {}
    remoteStudents.forEach(r => { if (r.email) remoteIndex[r.email.toLowerCase()] = r })

    // overrides (active status etc.)
    const overrides = gpState._studentOverrides || {}
    const readActive = (email, defaultVal = true) => {
      if (!email) return defaultVal
      const key = email in overrides ? email : email.toLowerCase()
      const ov = overrides[key]
      return ov && typeof ov.active === "boolean" ? ov.active : defaultVal
    }

    // merge: prefer remote data if email matches, else use gp-derived
    const merged = []
    const seenEmails = new Set()

    // include remote students first
    remoteStudents.forEach(r => {
      const gpProjects = gpArr.find(g => (g.email || "").toLowerCase() === (r.email || "").toLowerCase())?.projects || []
      merged.push({
        id: r.id,
        name: r.name,
        email: r.email,
        skills: r.skills || [],
        projects: gpProjects,
        profile: r.profile || {},
        role: r.role || "student",
        active: readActive(r.email, true),
        fromRemote: true
      })
      if (r.email) seenEmails.add(r.email.toLowerCase())
    })

    // add gp-derived students not present remotely
    gpArr.forEach(g => {
      if (!seenEmails.has((g.email || "").toLowerCase())) {
        merged.push({
          id: g.id,
          name: g.name,
          email: g.email,
          skills: g.skills || [],
          projects: g.projects || [],
          profile: {},
          role: "student",
          active: readActive(g.email, true),
          fromRemote: false
        })
      }
    })

    // sort by name/email
    merged.sort((a, b) => (a.name || a.email || "").localeCompare((b.name || b.email || "")))
    return merged
  }, [gpState.projects, gpState._studentOverrides, remoteStudents])

  // filters & pagination
  const filtered = useMemo(() => {
    let arr = students
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter((s) =>
        (s.name || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (Array.isArray(s.skills) ? s.skills.join(" ").toLowerCase() : (s.skills || "").toLowerCase()).includes(q)
      )
    }
    if (filterProject) arr = arr.filter((s) => (s.projects || []).includes(filterProject))
    if (statusFilter === "disabled") arr = arr.filter((s) => !s.active)
    if (statusFilter === "active") arr = arr.filter((s) => s.active)
    return arr
  }, [students, query, filterProject, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage))
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage)

  // keep page in range when filters/search shrink result set
  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [totalPages, page])

  // toggle active: stored in gpState override so demo behavior persists
  function toggleStudentActive(email) {
    const overrides = { ...(gpState._studentOverrides || {}) }
    const key = email || ""
    const current = overrides[key] || overrides[key.toLowerCase()] || { active: true }
    const nextActive = !(current.active ?? true)
    overrides[key] = { ...(current || {}), active: nextActive }
    setGpState((s) => ({ ...s, _studentOverrides: overrides }))
  }

  function impersonate(email) {
    alert(`Impersonation stub: now impersonating ${email} (demo)`) // UI unchanged
  }

  function editStudent(email) {
    alert(`Edit student ${email} - implement UI`) // UI unchanged
  }

  function removeFromAllProjects(email) {
    if (!confirm(`Remove ${email} from all projects? This will delete their membership (demo).`)) return
    setGpState((prev) => ({ ...prev, projects: prev.projects.map((p) => ({ ...p, members: (p.members || []).filter((m) => m !== email) })) }))
  }

  // Admin calls to backend (optional). If backend unreachable, show alerts.
  async function adminAddStudent(payload) {
    try {
      const res = await fetch(`${BACKEND_API}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => "\u200b")
        throw new Error(txt || "Failed to add student")
      }
      await fetchRemoteStudents()
      setShowAddModal(false)
      alert("Student added.")
    } catch (e) {
      console.error(e)
      alert("Failed to add student (check backend).")
    }
  }

  async function adminDeleteStudent(student) {
    if (!student || !student.email) {
      alert("Cannot delete this student from backend (missing id/email).")
      return
    }
    if (!confirm(`Delete ${student.name || student.email} from backend? This is irreversible.`)) return
    try {
      const id = student.id || student.email
      const res = await fetch(`${BACKEND_API}/api/students/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("delete failed")
      await fetchRemoteStudents()
      alert("Student deleted.")
    } catch (e) {
      console.error(e)
      alert("Failed to delete student (check backend).")
    }
  }

  /* ---------- Render ---------- */
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
              Manage enrolled users, their projects, and participation. Remote students (from backend) are merged with local demo data.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ImportCsvButton
              onImport={(newStudents) => {
                setGpState((prev) => {
                  const next = { ...prev }
                  newStudents.forEach((s) => {
                    (s.projects || []).forEach((pTitle) => {
                      let p = (next.projects || []).find((x) => x.title === pTitle)
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
                placeholder="Search by name, gmail or skill"
                className="outline-none text-sm w-64 placeholder:text-slate-400"
              />
            </div>

            {/* Add student via backend */}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="add-student inline-flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <PlusCircle className="w-5 h-5" /> New
            </button>
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
                {(gpState.projects || []).map((p) => (
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
              Showing {filtered.length} students ({remoteStudents.length} from backend)
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
                  <th>Email (Gmail)</th>
                  <th>Skills</th>
                  <th>Projects</th>
                  <th className="text-center">Joined</th>
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
                    onAdminDelete={adminDeleteStudent}
                    isRemote={!!s.fromRemote}
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
      {showAddModal && <AddStudentModal onClose={() => setShowAddModal(false)} onAdd={adminAddStudent} />}
    </div>
    /* End glossy background */
  )
}

/* ===== subcomponents ===== */

function StudentRow({ student, gpState, onToggleActive, onImpersonate, onEdit, onRemove, onAdminDelete, isRemote }) {
  const [open, setOpen] = useState(false)

  const assignedTasks = useMemo(() => {
    const tasks = []
      ; (gpState.projects || []).forEach((p) => {
        ; (p.tasks || []).forEach((t) => {
          if (t.assignee === student.email) tasks.push({ ...t, projectTitle: p.title })
        })
      })
    return tasks
  }, [gpState, student.email])

  // kept for potential future UI badges (no UI change now)
  // const completedPct = useMemo(() => {
  //   if (!assignedTasks.length) return 0
  //   const done = assignedTasks.filter((t) => t.status === "done").length
  //   return Math.round((done / assignedTasks.length) * 100)
  // }, [assignedTasks])

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
          <div className="text-sm text-slate-600">{student.email}</div>
        </td>
        <td className="align-top">
          <div className="text-sm text-slate-600">{(student.skills || []).slice(0, 3).join(", ") || "—"}</div>
        </td>
        <td className="align-top">
          <div className="text-sm text-slate-600">{(student.projects || []).slice(0, 3).map(pid => (gpState.projects || []).find(p => p.id === pid)?.title || pid).join(", ") || "—"}</div>
        </td>
        <td className="text-center align-top">
          <div className="text-sm text-slate-600">{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : "—"}</div>
        </td>
        <td className="text-right pr-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setOpen(true)} className="p-2 rounded-lg border hover:bg-slate-50 transition"><MoreHorizontal /></button>
            {/* Admin delete (only for remote students) */}
            {isRemote && (
              <button onClick={() => onAdminDelete(student)} className="p-2 rounded-lg border text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
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
        className="StudentDetailDrawer p-6 relative bg-white w-full max-w-md shadow-lg"
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
          <div className="student-info flex items-center gap-3">
            <div className="student-avatar w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium text-xl">
              {(student.name || "?")[0]?.toUpperCase()}
            </div>
            <div>
              <div className="text-lg font-semibold text-slate-800">
                {student.name}
              </div>
              <div className="text-sm text-slate-500">{student.email}</div>
              <div className="text-xs text-slate-400 mt-1">Skills: {(student.skills || []).join(", ") || "—"}</div>
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
              <div key={t.id || t.title} className="task-card p-2 border rounded flex items-center justify-between">
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
            {student.profile && student.profile.bio ? student.profile.bio : "(placeholder activity feed)"}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={onImpersonate}
            className="footer-btn primary px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Impersonate
          </button>
          <button
            onClick={onRemove}
            className="footer-btn secondary border px-4 py-2 rounded-lg"
          >
            Remove from projects
          </button>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(drawer, document.body)
}

/* ===== ImportCsvButton / simpleCsvParse (unchanged UI, minor safety) ===== */

function ImportCsvButton({ onImport }) {
  const fileRef = React.useRef(null)

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target.result
      const parsed = simpleCsvParse(text)
      const rows = parsed.map((r) => ({
        email: r.email || r.Email || r.email_address,
        name: r.name || r.Name || r.fullname,
        projects: (r.projects || r.Projects || "").split(";").map((s) => s.trim()).filter(Boolean)
      }))
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

function simpleCsvParse(text) {
  const lines = String(text || "").split(/\r?\n/).filter(Boolean)
  if (!lines.length) return []
  const header = lines[0].split(",").map((h) => h.trim())
  return lines.slice(1).map((ln) => {
    const cols = ln.split(",")
    const obj = {}
    header.forEach((h, i) => (obj[h] = (cols[i] || "").trim()))
    return obj
  })
}