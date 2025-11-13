// src/pages/ProjectsPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react"
import { List, Columns, PlusCircle, Users } from "lucide-react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { useAuth } from "../auth/AuthContext"

// storage key (keep compatibility with other pages but include meta)
const STORAGE_KEY = "gp_state_v1_projects_v2"

function readState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { projects: [], meta: { view: "list", filters: {} } }
    return JSON.parse(raw)
  } catch {
    return { projects: [], meta: { view: "list", filters: {} } }
  }
}
function writeState(s) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

/* ===== Utilities ===== */
function uid(prefix = "id") {
  return `${prefix}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
}

function projectProgress(project) {
  const tasks = project.tasks || []
  if (tasks.length === 0) return { percent: 0, done: 0, total: 0 }
  const done = tasks.filter((t) => t.status === "done").length
  const percent = Math.round((done / tasks.length) * 100)
  return { percent, done, total: tasks.length }
}

function daysUntil(deadline) {
  if (!deadline) return null
  const d = new Date(deadline)
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
  return diff
}

/* ===== UI Building Blocks ===== */
function ProgressBar({ percent = 0 }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div style={{ width: `${percent}%` }} className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />
    </div>
  )
}

function DeadlineBadge({ deadline }) {
  if (!deadline) return <span className="text-xs text-slate-400">—</span>
  const dLeft = daysUntil(deadline)
  const label = dLeft < 0 ? "Overdue" : dLeft <= 3 ? `Due in ${dLeft}d` : `Due ${deadline}`
  const color = dLeft < 0 ? "bg-red-100 text-red-700" : dLeft <= 3 ? "bg-yellow-100 text-yellow-800" : "bg-slate-50 text-slate-700"
  return <span className={`text-xs px-2 py-1 rounded ${color}`}>{label}</span>
}

function Avatars({ members = [], onClickMember }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 4).map((m) => (
        <div
          key={m}
          onClick={() => onClickMember && onClickMember(m)}
          title={m}
          className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs border cursor-pointer"
        >
          {m.split("@")[0].slice(0, 2).toUpperCase()}
        </div>
      ))}
      {members.length > 4 && (
        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs border">+{members.length - 4}</div>
      )}
    </div>
  )
}

/* ===== ProjectCard component (student controls only) ===== */
function ProjectCard({ p, onView, onQuickAddTask, onJoin, onLeave, currentEmail, onFilterByMember }) {
  const { percent, done, total } = projectProgress(p)
  const isMember = (p.members || []).map((m) => String(m).toLowerCase()).includes((currentEmail || "").toLowerCase())

  return (
    <motion.div whileHover={{ y: -6 }} className={`bg-white border rounded-lg p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold text-indigo-700 truncate">{p.title}</div>
            <div className="text-xs text-slate-400">{done}/{total} tasks</div>
          </div>
          <div className="text-sm text-slate-600 mt-1 truncate">{p.description}</div>

          <div className="mt-3 space-y-2">
            <ProgressBar percent={percent} />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <Avatars members={p.members} onClickMember={onFilterByMember} />
                <div className="text-xs text-slate-500 ml-2"> {percent}% </div>
              </div>
              <DeadlineBadge deadline={p.deadline} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button onClick={() => onView(p)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">View</button>

          <div className="flex gap-2">
            <button onClick={() => onQuickAddTask(p.id)} className="px-2 py-1 border rounded text-sm">+Task</button>

            {!isMember ? (
              <button onClick={() => onJoin(p.id)} className="px-2 py-1 bg-indigo-600 text-white rounded text-sm">Join</button>
            ) : (
              <button onClick={() => onLeave(p.id)} className="px-2 py-1 border rounded text-sm">Leave</button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ===== Create Project Modal (students should not create projects normally) =====
   Keep modal available but disabled by default; students shouldn't create projects,
   but this modal can remain for instructors or future use. Here we hide the "New Project" CTA.
*/
function CreateProjectModal({ onClose, onCreate, template }) {
  const [title, setTitle] = useState(template?.title || "")
  const [startDate, setStartDate] = useState(template?.startDate || "")
  const [endDate, setEndDate] = useState(template?.deadline || "")
  const [techStack, setTechStack] = useState(template?.techStack || "")
  const [maxMembers, setMaxMembers] = useState(template?.maxMembers || "")
  const [desc, setDesc] = useState(template?.description || "")

  function submit() {
    if (!title) return alert("Please enter a project title")
    // Keep compatibility with existing createProject signature.
    // createProject expects { title, description, deadline, members }
    onCreate({
      title,
      description: desc,
      deadline: endDate,
      members: "", // student modal doesn't accept members directly in the first screenshot
      // include extra meta for potential future use
      startDate,
      techStack,
      maxMembers,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-2xl p-6 shadow-xl w-[560px] max-w-[92%]"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Create Project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project Title"
            className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Start Date (YYYY-MM-DD)"
              className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            />
            <input
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="End Date (YYYY-MM-DD)"
              className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="Tech Stack Used (e.g., React, Node.js, Python)"
              className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            />
            <input
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
              placeholder="Max Number of Members"
              className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            />
          </div>

          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Description of the Project"
            className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            rows={4}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button
              onClick={submit}
              className="px-4 py-2 rounded-lg text-white text-sm bg-gradient-to-r from-indigo-600 to-purple-600 shadow"
            >
              Create
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

/* ===== Project Drawer (view-only for students, but allow adding personal tasks) ===== */
function ProjectDrawer({ project, onClose, onAddPersonalTask, onUpdateTask }) {
  const [taskTitle, setTaskTitle] = useState("")
  const [assignee, setAssignee] = useState("")

  function addTask() {
    if (!taskTitle) return
    onAddPersonalTask(project.id, taskTitle, assignee)
    setTaskTitle("")
    setAssignee("")
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-transparent" onClick={onClose} />
      <motion.div initial={{ x: 420 }} animate={{ x: 0 }} className="ml-auto w-[520px] bg-white h-full p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold text-indigo-700">{project.title}</div>
            <div className="text-sm text-slate-500">{project.description}</div>
            <div className="text-xs text-slate-400 mt-2">Deadline: {project.deadline || "—"}</div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium">Members</h4>
          <div className="mt-2 flex items-center gap-2">
            {(project.members || []).map((m) => (
              <div key={m} className="px-2 py-1 bg-slate-50 rounded text-xs">{m}</div>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium">Add Personal Task</h4>
          <div className="mt-2 flex gap-2">
            <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Task title" className="px-3 py-2 border rounded-lg flex-1" />
            <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assignee email (optional)" className="px-3 py-2 border rounded-lg w-64" />
            <button onClick={addTask} className="px-3 py-2 bg-indigo-600 text-white rounded-lg">Add</button>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium">Tasks</h4>
          <div className="mt-2 space-y-2">
            {(project.tasks || []).map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded px-3 py-2">
                <div>
                  <div className="text-sm font-medium">{t.title}</div>
                  <div className="text-xs text-slate-400">{t.assignee}</div>
                </div>
                <div className="text-xs text-slate-500">{t.status}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}

/* ===== Toast for undo (simple) ===== */
function Toast({ message, actionLabel, onAction, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return createPortal(
    <div className="fixed right-6 bottom-6 bg-white border rounded-lg shadow p-3 flex items-center gap-4">
      <div className="text-sm">{message}</div>
      {actionLabel && (
        <button onClick={onAction} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">{actionLabel}</button>
      )}
      <button onClick={onClose} className="text-slate-400 text-sm px-2">✕</button>
    </div>,
    document.body
  )
}

/* ===== Main Page Component (Student-only) ===== */
export default function ProjectsPage() {
  const initial = readState()
  const [gpState, setGpState] = useState(initial)
  const [view, setView] = useState(initial.meta?.view || "list") // 'list' or 'kanban'
  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false) // hidden for students (no CTA shown)
  const [selectedProject, setSelectedProject] = useState(null)
  const [filterMember, setFilterMember] = useState(initial.meta?.filters?.member || "")
  const [filterStatus, setFilterStatus] = useState(initial.meta?.filters?.status || "all")
  const [selectedProjectIdForKanban, setSelectedProjectIdForKanban] = useState("all")
  const [dragging, setDragging] = useState(null) // { projectId, taskId }
  const [hoverColumn, setHoverColumn] = useState(null)
  const [toast, setToast] = useState(null)
  const undoRef = useRef(null)

  const { user } = useAuth()
  const myEmail = (user?.email || "").toLowerCase()

  // persist to localStorage whenever gpState or view/filters change
  useEffect(() => {
    const toSave = { ...gpState, meta: { view, filters: { member: filterMember, status: filterStatus } } }
    writeState(toSave)
  }, [gpState, view, filterMember, filterStatus])

  // keyboard: 'n' for new project (students won't use, but keep handler)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "n" && (document.activeElement.tagName === "BODY" || document.activeElement.tagName === "DIV")) {
        // keep hidden for students (no CTA), but still allow power users if needed
        setShowCreate(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // derived
  const projects = gpState.projects || []

  const allMembers = useMemo(() => {
    const s = new Set()
    projects.forEach((p) => (p.members || []).forEach((m) => s.add(m)))
    return Array.from(s)
  }, [projects])

  // filtered list (search + member + status)
  const filtered = useMemo(() => {
    const q = (search || "").toLowerCase()
    return projects
      .filter((p) => {
        if (filterMember && !(p.members || []).includes(filterMember)) return false
        if (filterStatus === "active" && p.status === "archived") return false
        if (filterStatus === "archived" && p.status !== "archived") return false
        if (!q) return true
        return (
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.members || []).some((m) => (m || "").toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        const aDue = a.deadline ? new Date(a.deadline).getTime() : 0
        const bDue = b.deadline ? new Date(b.deadline).getTime() : 0
        return (bDue - aDue) || (b.createdAt ? b.createdAt : 0) - (a.createdAt ? a.createdAt : 0)
      })
  }, [projects, search, filterMember, filterStatus])

  /* ===== state mutation helpers (student-appropriate) ===== */
  function createProject({ title, description, deadline, members }) {
    // keep functionality but students normally won't see the button
    const newProject = {
      id: uid("p"),
      title,
      description,
      deadline,
      members: (members || "").split(",").map((m) => m.trim()).filter(Boolean),
      tasks: [],
      status: "active",
      createdAt: Date.now(),
    }
    setGpState((s) => ({ ...s, projects: [newProject, ...(s.projects || [])] }))
    setShowCreate(false)
  }

  function addPersonalTask(projectId, title, assignee) {
    if (!title) return
    setGpState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: [...(p.tasks || []), { id: uid("t"), title, assignee, status: "todo" }] } : p
      ),
    }))
  }

  function updateTask(projectId, taskId, updates) {
    setGpState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId ? { ...p, tasks: (p.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t)) } : p
      ),
    }))
  }

  function joinProject(projectId) {
    setGpState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) =>
        p.id === projectId
          ? { ...p, members: Array.from(new Set([...(p.members || []), user.email])) }
          : p
      ),
    }))
    setToast({ message: "Joined project", actionLabel: null })
  }

  function leaveProject(projectId) {
    setGpState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === projectId ? { ...p, members: (p.members || []).filter((m) => (m || "").toLowerCase() !== myEmail) } : p)),
    }))
    setToast({ message: "Left project", actionLabel: null })
  }

  /* ===== Drag handlers (Kanban) ===== */
  function onDragStart(e, projectId, taskId) {
    setDragging({ projectId, taskId })
    e.dataTransfer.effectAllowed = "move"
    try { e.dataTransfer.setData("text/plain", JSON.stringify({ projectId, taskId })) } catch {}
  }

  function onDropToColumn(e, targetStatus) {
    e.preventDefault()
    const payload = dragging
    if (!payload) return
    const { projectId, taskId } = payload
    updateTask(projectId, taskId, { status: targetStatus })
    setDragging(null)
    setHoverColumn(null)
  }

  function onAllowDrop(e) { e.preventDefault() }

  /* ===== Kanban helpers ===== */
  function tasksForColumn(col) {
    const pool = selectedProjectIdForKanban === "all"
      ? (projects.flatMap((p) => (p.tasks || []).map((t) => ({ ...t, projectId: p.id, projectTitle: p.title }))))
      : (() => {
          const p = projects.find((x) => x.id === selectedProjectIdForKanban)
          return (p?.tasks || []).map((t) => ({ ...t, projectId: p.id, projectTitle: p.title }))
        })()
    return pool.filter((t) => t.status === col)
  }

  function columnCount(col) {
    return tasksForColumn(col).length
  }

  /* ===== Project open/close (student view) ===== */
  function openProject(p) {
    setSelectedProject(p)
  }
  function closeProject() {
    setSelectedProject(null)
  }

  /* ===== Quick inline helpers ===== */
  function quickAddTaskPrompt(pid) {
    const title = prompt("Task title")
    if (title) addPersonalTask(pid, title, myEmail)
  }

  /* ===== Templates (small) ===== */
  const templates = [
    { id: "tpl-sprint", title: "1-week Sprint", description: "Sprint with planning and review", members: [], deadline: "" },
    { id: "tpl-design", title: "Design Review", description: "Design review & assets", members: [], deadline: "" },
  ]

  return (
    <div className="projects-page-bg min-h-screen p-8">
      <div className="max-w-7xl mx-auto projects-page">
        {/* header */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Projects</h2>
            <p className="text-sm text-slate-500 mt-1">Browse projects, join teams and manage your personal tasks.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border bg-white px-3 py-2 shadow-sm">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects, members" className="outline-none text-sm w-64 placeholder:text-slate-400" />
            </div>

            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border shadow-sm">
              <button onClick={() => setView("list")} className={`px-3 py-2 rounded ${view === "list" ? "bg-indigo-50 text-indigo-700" : ""}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setView("kanban")} className={`px-3 py-2 rounded ${view === "kanban" ? "bg-indigo-50 text-indigo-700" : ""}`}><Columns className="w-4 h-4" /></button>
            </div>

            {/* Students don't create projects from here; remove CTA to avoid confusion */}
            <button disabled className="px-3 py-2 rounded bg-indigo-200 text-white flex items-center gap-2 opacity-60 cursor-not-allowed">
              <PlusCircle className="w-4 h-4" /> Request Project
            </button>
          </div>
        </div>

        {/* filters / chips */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <button className={`text-sm px-2 py-1 rounded ${filterStatus === "all" ? "bg-indigo-50 text-indigo-700" : ""}`} onClick={() => setFilterStatus("all")}>All</button>
            <button className={`text-sm px-2 py-1 rounded ${filterStatus === "active" ? "bg-indigo-50 text-indigo-700" : ""}`} onClick={() => setFilterStatus("active")}>Active</button>
            <button className={`text-sm px-2 py-1 rounded ${filterStatus === "archived" ? "bg-indigo-50 text-indigo-700" : ""}`} onClick={() => setFilterStatus("archived")}>Archived</button>
          </div>

          <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
            <select value={filterMember} onChange={(e) => setFilterMember(e.target.value)} className="text-sm outline-none">
              <option value="">All members</option>
              {allMembers.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={selectedProjectIdForKanban} onChange={(e) => setSelectedProjectIdForKanban(e.target.value)} className="text-sm outline-none">
              <option value="all">All projects (kanban)</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>

          <div className="ml-auto text-sm text-slate-500">Templates:
            {templates.map((t) => (
              <button key={t.id} onClick={() => { setShowCreate(true); /* pass template if needed */ }} className="ml-2 underline text-indigo-600">{t.title}</button>
            ))}
          </div>
        </div>

        {/* main card */}
        <div className="students-card p-4 rounded-2xl">
          {view === "list" ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => (
                <ProjectCard
                  key={p.id}
                  p={p}
                  onView={openProject}
                  onQuickAddTask={quickAddTaskPrompt}
                  onJoin={joinProject}
                  onLeave={leaveProject}
                  currentEmail={myEmail}
                  onFilterByMember={(m) => { setFilterMember(m); setSearch("") }}
                />
              ))}
              {filtered.length === 0 && <div className="text-slate-500 p-6">No projects yet — check back or request one from your instructor.</div>}
            </div>
          ) : (
            /* Kanban view */
            <div className="grid grid-cols-3 gap-4">
              {["todo", "in-progress", "done"].map((col) => (
                <div
                  key={col}
                  onDragOver={onAllowDrop}
                  onDrop={(e) => onDropToColumn(e, col)}
                  onDragEnter={() => setHoverColumn(col)}
                  onDragLeave={() => setHoverColumn(null)}
                  className={`bg-white border rounded-lg p-3 min-h-[260px] ${hoverColumn === col ? "ring-2 ring-indigo-50" : ""}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold capitalize">{col.replace("-", " ")}</div>
                    <div className="text-xs text-slate-400">{columnCount(col)} tasks</div>
                  </div>

                  {/* list tasks across selected scope — grouped by project */}
                  <div className="space-y-3">
                    {tasksForColumn(col).map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, t.projectId, t.id)}
                        className="task-card p-3 border rounded cursor-grab bg-white"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-800">{t.title}</div>
                            <div className="text-xs text-slate-400">{t.projectTitle}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="text-xs px-2 py-1 border rounded"
                              onClick={() => updateTask(t.projectId, t.id, { status: t.status === "todo" ? "in-progress" : t.status === "in-progress" ? "done" : "todo" })}
                            >
                              Cycle
                            </button>
                            <div className="text-xs text-slate-500">{t.assignee || "-"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {tasksForColumn(col).length === 0 && <div className="text-slate-400 text-sm">No tasks</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* create modal (students usually won't see CTA; modal kept hidden until triggered) */}
        {showCreate && (
          <CreateProjectModal onClose={() => setShowCreate(false)} onCreate={createProject} />
        )}

        {/* project drawer (student view) */}
        {selectedProject && (
          <ProjectDrawer
            project={selectedProject}
            onClose={closeProject}
            onAddPersonalTask={addPersonalTask}
            onUpdateTask={updateTask}
          />
        )}
      </div>

      {/* toast (undo/info) */}
      {toast && (
        <Toast
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={() => toast.onAction && toast.onAction()}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
