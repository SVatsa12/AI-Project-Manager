// src/pages/StudentsPage.jsx
import React, { useEffect, useMemo, useState } from "react"
import { Search, Edit2, Trash2, UserX, MoreHorizontal, UploadCloud, PlusCircle } from "lucide-react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { io } from "socket.io-client"
// import { Transition } from "@headlessui/react"; // optional

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

/* ===== EditStudentModal (small, local edit modal) ===== */
function EditStudentModal({ student, onClose, onSave }) {
  const [form, setForm] = useState({
    name: student?.name || "",
    email: student?.email || "",
    skills: (student?.skills || []).join(", "),
  })

  useEffect(() => {
    setForm({
      name: student?.name || "",
      email: student?.email || "",
      skills: (student?.skills || []).join(", "),
    })
  }, [student])

  function change(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function submit(e) {
    e.preventDefault()
    const payload = {
      ...student,
      name: form.name.trim(),
      email: form.email.trim(),
      skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
    }
    await onSave(payload)
  }

  if (!student) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Student</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600">Name</label>
            <input name="name" value={form.name} onChange={change} required className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Email</label>
            <input name="email" type="email" value={form.email} onChange={change} required className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">Skills (comma separated)</label>
            <input name="skills" value={form.skills} onChange={change} className="w-full border rounded-lg px-3 py-2 mt-1" />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ===== ConfirmDialog (reusable) ===== */
function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-sm p-5 z-10">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-slate-600 mt-2">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg">Delete</button>
        </div>
      </div>
    </div>,
    document.body
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

  // confirm dialog state (reusable for delete/remove)
  const [confirmState, setConfirmState] = useState({ open: false, action: null, payload: null })
  // action: 'delete' | 'removeFromProjects'
  function openConfirm(action, payload) {
    setConfirmState({ open: true, action, payload })
  }
  function closeConfirm() {
    setConfirmState({ open: false, action: null, payload: null })
  }

  // edit modal
  const [editStudent, setEditStudent] = useState(null)
  function openEdit(student) {
    setEditStudent(student)
  }
  function closeEdit() {
    setEditStudent(null)
  }

  // Toast state (simple single visible toast)
  const [toast, setToast] = useState(null)
  // toast shape: { id, type: 'success'|'error'|'info', title?, message? }

  function showToast({ type = "info", title = "", message = "", duration = 4000 }) {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7)
    const t = { id, type, title, message }
    setToast(t)
    setTimeout(() => {
      setToast((cur) => (cur && cur.id === id ? null : cur))
    }, duration)
  }

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
    showToast({ type: "info", title: "Status changed", message: `${email} is now ${nextActive ? "active" : "disabled"}` })
  }

  function handleImpersonate(email) {
    // demo impersonation behaviour: show toast + could call auth endpoint / set cookie in real app
    showToast({ type: "info", title: "Impersonation", message: `Now impersonating ${email} (demo)` })
    // TODO: implement real impersonation flow if needed
  }

  function handleEditSave(updatedStudent) {
    // in this demo we update local gpState overrides or remote list as appropriate
    // If remote, ideally call backend PATCH endpoint; here we update remoteStudents locally if present
    const email = (updatedStudent.email || "").toLowerCase()
    setRemoteStudents((prev) => prev.map(r => (r.email && r.email.toLowerCase() === email ? { ...r, ...updatedStudent } : r)))
    // also update gpState membership display (names)
    setGpState((prev) => {
      return {
        ...prev,
        projects: (prev.projects || []).map(p => ({
          ...p,
          members: (p.members || []).map(m => m === updatedStudent.id ? updatedStudent.email : m)
        }))
      }
    })
    closeEdit()
    showToast({ type: "success", title: "Saved", message: `${updatedStudent.name} updated (demo)` })
  }

  async function adminAddStudent(payload) {
    console.log("[adminAddStudent] payload:", payload);
    try {
      const res = await fetch(`${BACKEND_API}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      console.log("[adminAddStudent] response.status:", res.status, res.statusText);

      // try to parse json, otherwise text
      let bodyText;
      try {
        bodyText = await res.clone().json();
        console.log("[adminAddStudent] response.json():", bodyText);
      } catch (e) {
        bodyText = await res.text();
        console.log("[adminAddStudent] response.text():", bodyText);
      }

      if (!res.ok) {
        // show the backend message if any
        const msg = (typeof bodyText === "string" && bodyText.trim()) ? bodyText : JSON.stringify(bodyText);
        throw new Error(msg || `Failed to add student (status ${res.status})`);
      }

      await fetchRemoteStudents();
      setShowAddModal(false);
      showToast({ type: "success", title: "Student added", message: `${payload.name} (${payload.email}) was added.` });

    } catch (e) {
      console.error("[adminAddStudent] error:", e);
      showToast({ type: "error", title: "Add failed", message: e.message || "Failed to add student (check backend)." });
    }
  }

  // admin delete confirmed (called by ConfirmDialog)
  async function adminDeleteStudentConfirmed() {
    const student = confirmState.payload
    if (!student || !student.email) {
      showToast({ type: "error", title: "Delete failed", message: "Cannot delete (missing id/email)." });
      closeConfirm();
      return;
    }
    try {
      const id = student.id || student.email;
      const res = await fetch(`${BACKEND_API}/api/students/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "delete failed");
      }
      await fetchRemoteStudents();
      showToast({ type: "success", title: "Deleted", message: `${student.name || student.email} deleted.` });
    } catch (e) {
      console.error("[adminDeleteStudentConfirmed] error:", e);
      showToast({ type: "error", title: "Delete failed", message: e.message || "Failed to delete student (check backend)." });
    } finally {
      closeConfirm();
    }
  }

  // remove from projects confirmed (called by ConfirmDialog)
  function removeFromAllProjectsConfirmed() {
    const email = confirmState.payload
    if (!email) {
      showToast({ type: "error", title: "Remove failed", message: "Missing email." })
      closeConfirm()
      return
    }
    setGpState((prev) => ({ ...prev, projects: prev.projects.map((p) => ({ ...p, members: (p.members || []).filter((m) => m !== email) })) }))
    closeConfirm()
    showToast({ type: "success", title: "Removed", message: `${email} removed from all projects.` })
  }

  /* ---------- Render ---------- */
  return (
    /* ====== Full-width colored glossy background ====== */
    <div className="students-page-bg">
      {/* Toast container (top-right) */}
      <div aria-live="polite" className="fixed top-6 right-6 z-50">
        {toast && (
          <div className="max-w-sm w-full">
            <div
              className={`pointer-events-auto rounded-lg shadow-lg ring-1 ring-black/5 overflow-hidden transform transition-all ${
                toast.type === "success" ? "bg-emerald-600 text-white" :
                toast.type === "error" ? "bg-red-600 text-white" : "bg-white text-slate-900"
              }`}
              role="status"
            >
              <div className="p-3 flex gap-3 items-start">
                <div className="flex-shrink-0 mt-0.5">
                  {toast.type === "success" ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : toast.type === "error" ? (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {toast.title && <div className="text-sm font-semibold">{toast.title}</div>}
                  <div className={`mt-1 text-sm ${toast.type === "success" || toast.type === "error" ? "text-white/90" : "text-slate-700"}`}>
                    {toast.message}
                  </div>
                </div>

                <div className="flex-shrink-0 self-start">
                  <button
                    onClick={() => setToast(null)}
                    className={`inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      toast.type === "success" || toast.type === "error" ? "text-white/90 focus:ring-white/40" : "text-slate-400 focus:ring-slate-200"
                    }`}
                    aria-label="Close notification"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

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
                showToast({ type: "success", title: "Imported", message: `${(newStudents || []).length} rows imported (demo)` })
              }}
              showToast={showToast}
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
                    onImpersonate={handleImpersonate}
                    onEdit={(st) => openEdit(st)}
                    onRemove={(email) => openConfirm("removeFromProjects", email)}
                    onAdminDelete={(st) => openConfirm("delete", st)}
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

      {/* Edit modal */}
      {editStudent && <EditStudentModal student={editStudent} onClose={closeEdit} onSave={handleEditSave} />}

      {/* Confirm dialog (delete / remove actions) */}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.action === "delete" ? `Delete ${confirmState.payload?.name || confirmState.payload?.email}?` : `Remove ${confirmState.payload || ""} from projects?`}
        message={confirmState.action === "delete"
          ? `Delete ${confirmState.payload?.name || confirmState.payload?.email} from backend? This action is irreversible.`
          : `Remove ${confirmState.payload || ""} from all projects? This cannot be undone in demo data.`}
        onConfirm={() => {
          if (confirmState.action === "delete") adminDeleteStudentConfirmed()
          else if (confirmState.action === "removeFromProjects") removeFromAllProjectsConfirmed()
        }}
        onCancel={closeConfirm}
      />
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

      {open && <StudentDetailDrawer student={student} assignedTasks={assignedTasks} onClose={() => setOpen(false)} onToggleActive={() => onToggleActive(student.email)} onImpersonate={() => onImpersonate(student.email)} onEdit={() => onEdit(student)} onRemove={() => onRemove(student.email)} />}
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button - moved slightly so it doesn't overlap the action buttons */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 text-lg z-20"
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

          {/* Action buttons placed in separate container to prevent overlap with close */}
          <div className="ml-auto flex gap-2 items-start">
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-slate-50 transition"
              onClick={onEdit}
              title="Edit student"
            >
              <Edit2 className="w-4 h-4 inline mr-1" /> Edit
            </button>
            <button
              className="px-3 py-1 border rounded text-sm hover:bg-slate-50 transition"
              onClick={onToggleActive}
              title="Toggle active"
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
            onClick={() => onImpersonate(student.email)}
            className="footer-btn primary px-4 py-2 bg-emerald-600 text-white rounded-lg"
          >
            Impersonate
          </button>
          <button
            onClick={() => onRemove(student.email)}
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

function ImportCsvButton({ onImport, showToast }) {
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
      if (typeof showToast === "function") {
        showToast({ type: "success", title: "Imported", message: `${rows.length} rows imported (demo)` })
      }
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
