// src/pages/AdminProjectsPage.jsx
import React, { useEffect, useMemo, useState } from "react"
import { PlusCircle, Trash2, Archive, CheckCircle, Users, X } from "lucide-react"
import { motion } from "framer-motion"
import { createPortal } from "react-dom"
import { useProjectsBackend } from "../contexts/ProjectsBackendContext"
import "../styles/admin-projects.css"

// Note: All projects data now syncs through MongoDB backend via ProjectsBackendContext
const AUDIT_KEY = "gp_state_v1_projects_v2_audit"
const OVERLOAD_THRESHOLD = 3;
function readAudit() {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]")
  } catch {
    return []
  }
}
function writeAudit(a) {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(a))
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`
}

/* ---------- Helpers ---------- */
function projectProgress(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : []
  if (tasks.length === 0) return { percent: 0, done: 0, total: 0 }
  const done = tasks.filter((t) => t.status === "done").length
  const percent = Math.round((done / tasks.length) * 100)
  return { percent, done, total: tasks.length }
}

function tasksByStatus(project) {
  const tasks = Array.isArray(project.tasks) ? project.tasks : []
  return {
    todo: tasks.filter((t) => t.status === "todo"),
    inprogress: tasks.filter((t) => t.status === "in-progress"),
    done: tasks.filter((t) => t.status === "done"),
  }
}

// compute overloaded students: map assignee -> count of active tasks
function computeOverloadedStudents(projects, threshold = 3) {
  const map = new Map()
  projects.forEach((p) => {
    if (p.status === "archived") return
    ;(p.tasks || []).forEach((t) => {
      const a = (t.assignee || "").toLowerCase().trim()
      if (!a) return
      map.set(a, (map.get(a) || 0) + 1)
    })
  })
  // count students with > threshold tasks
  const overloaded = Array.from(map.entries()).filter(([_, c]) => c > threshold)
  return { map, overloaded, count: overloaded.length }
}

function formatDate(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    console.error("Invalid date format:", dateString);
    return dateString;
  }
}


function CreateProjectModal({ onClose, onCreate, defaultTemplate }) {
  const [title, setTitle] = useState(defaultTemplate?.title || "")
  const [startDate, setStartDate] = useState(defaultTemplate?.startDate || "")
  const [endDate, setEndDate] = useState(defaultTemplate?.endDate || "")
  const [techStack, setTechStack] = useState(defaultTemplate?.techStack || "")
  const [maxMembers, setMaxMembers] = useState(defaultTemplate?.maxMembers || "")
  const [description, setDescription] = useState(defaultTemplate?.description || "")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (submitting) return // Prevent double submission
    if (!title) return alert("Please enter a title")
    if (!startDate) return alert("Add a start date")
    if (!endDate) return alert("Add an end date")
    if (!maxMembers || isNaN(maxMembers) || parseInt(maxMembers) <= 0) return alert("Add a valid max number of members")
    
    // Create project with the new structure matching AdminDashboard
    const newProject = {
      id: uid("p"),
      title,
      description,
      startDate,
      endDate,
      techStack,
      maxMembers: parseInt(maxMembers),
      members: [], // start with empty members array
      tasks: [],
      status: "active",
      createdAt: Date.now()
    }
    
    setSubmitting(true)
    try {
      await onCreate(newProject)
      onClose()
    } catch (err) {
      console.error('Error creating project:', err)
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-2xl p-6 shadow-xl w-[520px] max-w-[92%]"
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Create Project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Project Title"
            className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
          />
          
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
            type="number"
            min="1"
            className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
          />
          
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description of the Project"
            className="w-full px-3 py-2 border rounded-lg outline-none text-sm"
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <button 
              onClick={onClose} 
              disabled={submitting}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-white text-sm bg-indigo-600 shadow hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}


/* ---------- Project Drawer ---------- */
function ProjectDrawer({ project, onClose, onRemoveMember, onAddTask, onUpdateProject }) {
  const [taskTitle, setTaskTitle] = useState("")
  const [assignee, setAssignee] = useState("")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!project) {
      setTaskTitle("")
      setAssignee("")
      setShowDeleteConfirm(false)
    }
  }, [project])

  if (!project) return null

  const grouped = tasksByStatus(project)
  const prog = projectProgress(project)

  function addTask() {
    if (!taskTitle.trim()) return
    const newTask = { id: uid("t"), title: taskTitle.trim(), assignee: assignee.trim(), status: "todo", createdAt: Date.now() }
    onAddTask(project.id, newTask)
    setTaskTitle("")
    setAssignee("")
  }

  return createPortal(
    <div className="ap-drawer-overlay">
      <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} className="ap-drawer">
        <div className="ap-drawer-header">
          <div>
            <h3 className="ap-drawer-title">{project.title}</h3>
            <div className="ap-drawer-sub">{project.description}</div>
          </div>
          <button className="ap-icon-btn" onClick={onClose}><X /></button>
        </div>

        <div className="ap-drawer-body">
          <div className="ap-section">
            <div className="ap-section-title">Members</div>
            <div className="ap-members">
              {(project.members || []).map((m) => (
                <div className="ap-member" key={m}>
                  <div className="ap-member-avatar">{m.split("@")[0].slice(0,2).toUpperCase()}</div>
                  <div className="ap-member-info">
                    <div className="ap-member-email">{m}</div>
                    <div className="ap-member-meta">Assigned tasks: {(project.tasks || []).filter(t => (t.assignee || "").toLowerCase() === m.toLowerCase()).length}</div>
                  </div>
                  <button className="ap-member-remove" onClick={() => onRemoveMember(project.id, m)}>Remove</button>
                </div>
              ))}
              {(!project.members || project.members.length === 0) && <div className="text-muted">No members yet</div>}
            </div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Progress</div>
            <div className="ap-progress-row">
              <div className="ap-progress-bar-outer"><div className="ap-progress-bar-inner" style={{ width: `${prog.percent}%` }} /></div>
              <div className="ap-progress-text">{prog.done}/{prog.total} tasks • {prog.percent}%</div>
            </div>
          </div>

          <div className="ap-section">
            <div className="ap-section-title">Tasks</div>

            <div className="ap-task-columns">
              {["todo", "inprogress", "done"].map((col) => (
                <div key={col} className="ap-task-column">
                  <div className="ap-task-column-title">{col === "inprogress" ? "In Progress" : col.charAt(0).toUpperCase() + col.slice(1)}</div>
                  <div className="ap-task-list">
                    {(grouped[col] || []).map((t) => (
                      <div className="ap-task" key={t.id}>
                        <div>
                          <div className="ap-task-title">{t.title}</div>
                          <div className="ap-task-meta">{t.assignee || "—"}</div>
                        </div>
                        <div className="ap-task-status">{t.status === "done" ? <CheckCircle className="icon" /> : null}</div>
                      </div>
                    ))}
                    {(grouped[col] || []).length === 0 && <div className="text-muted">No tasks</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="ap-add-task-row">
              <input className="ap-input" placeholder="Task title" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              <input className="ap-input" placeholder="Assignee email" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              <button onClick={addTask} className="ap-btn ap-btn-primary">Add</button>
            </div>
          </div>
        </div>

        <div className="ap-drawer-footer">
          <button className="ap-btn ap-btn-ghost" onClick={() => onUpdateProject(project.id, { status: project.status === "archived" ? "active" : "archived" })}>
            {project.status === "archived" ? "Unarchive" : "Archive"}
          </button>
          <button className="ap-btn ap-btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            <Trash2 className="icon" /> Delete
          </button>
        </div>

        {/* Delete confirmation for drawer */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeleteConfirm(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-[400px] max-w-[92%]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">Delete Project</h3>
                  <p className="text-sm text-slate-600 mt-2">
                    Are you sure you want to delete <span className="font-semibold text-slate-900">"{project.title}"</span>? This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onUpdateProject(project.id, { delete: true })
                    setShowDeleteConfirm(false)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
                >
                  Delete Project
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  )
}

/* ---------- Main AdminProjectsPage ---------- */
export default function AdminProjectsPage() {
  // Use backend context instead of localStorage
  const { 
    projects: backendProjects, 
    loading, 
    createProject: createProjectBackend,
    updateProject: updateProjectBackend,
    deleteProject: deleteProjectBackend,
    addTask: addTaskBackend,
    updateTask: updateTaskBackend,
    deleteTask: deleteTaskBackend
  } = useProjectsBackend();

  // Local state for UI
  const [audit, setAudit] = useState(() => readAudit())
  const [query, setQuery] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [drawerProject, setDrawerProject] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { projectId, projectTitle }

  useEffect(() => writeAudit(audit), [audit])

  const projects = backendProjects || []

  function logAction(text) {
    setAudit((s) => [{ id: uid("a"), text, ts: Date.now() }, ...s].slice(0, 300))
  }

  // derived analytics
  const analytics = useMemo(() => {
    const total = projects.length
    const active = projects.filter((p) => p.status !== "archived").length
    const archived = total - active
    const avgCompletion = Math.round((projects.reduce((acc, p) => acc + (projectProgress(p).percent || 0), 0) / (total || 1)) || 0)
    const overloaded = computeOverloadedStudents(projects, 3)
    return { total, active, archived, avgCompletion, overloaded }
  }, [projects])

  // filtered projects by search
  const filtered = useMemo(() => {
    const q = (query || "").toLowerCase()
    if (!q) return projects
    return projects.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.members || []).some((m) => (m || "").toLowerCase().includes(q))
    )
  }, [projects, query])

  /* ----- CRUD / helpers ----- */
  async function createProject(project) {
    try {
      await createProjectBackend(project);
      logAction(`Created project "${project.title}"`);
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project. Please try again.');
    }
  }

  async function updateProject(projectId, patch) {
    try {
      // If patch contains delete:true, delete the project instead
      if (patch.delete) {
        const removed = projects.find((p) => p.id === projectId);
        await deleteProjectBackend(projectId);
        logAction(`Deleted project "${removed?.title || projectId}"`);
        if (drawerProject && drawerProject.id === projectId) setDrawerProject(null);
        return;
      }

      await updateProjectBackend(projectId, patch);
      logAction(`Updated project ${projectId}`);
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Failed to update project. Please try again.');
    }
  }

  async function addTask(projectId, task) {
    try {
      await addTaskBackend(projectId, { taskId: task.id, ...task });
      logAction(`Added task to ${projectId}`);
    } catch (err) {
      console.error('Failed to add task:', err);
      alert('Failed to add task. Please try again.');
    }
  }

  async function removeMember(projectId, memberEmail) {
    try {
      const project = projects.find(p => p.id === projectId);
      if (!project) return;
      
      const updatedMembers = (project.members || []).filter((m) => m !== memberEmail);
      await updateProjectBackend(projectId, { members: updatedMembers });
      logAction(`Removed member ${memberEmail} from ${projectId}`);
      
      // if the drawer is open for same project, update drawerProject so UI updates immediately
      if (drawerProject && drawerProject.id === projectId) {
        setDrawerProject((prev) => prev ? { ...prev, members: updatedMembers } : prev);
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
      alert('Failed to remove member. Please try again.');
    }
  }

  /* Pull latest project details before opening drawer */
  function openDrawer(projectId) {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;
    setDrawerProject(p);
  }

  /* ----- small demo template list (quick create) ----- */
  const templates = [
    { title: "1-week Sprint", description: "Short sprint: planning, dev, review", members: [], deadline: "" },
    { title: "Design Review", description: "Design deliverables and review", members: [], deadline: "" },
    { title: "Mini Research", description: "Literature review + prototype", members: [], deadline: "" },
  ]

  return (
    <div className="ap-page">
      <div className="ap-container">
        <header className="ap-header">
          <div>
            <h1 className="ap-title">Projects — Admin</h1>
            <p className="ap-sub">Manage all projects, view member lists and monitor task status. {loading && <span className="text-indigo-600">• Syncing...</span>}</p>
          </div>

          <div className="ap-header-actions">
            <div className="ap-search">
              <input placeholder="Search projects, members" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>

            <div className="ap-templates">
              <select onChange={(e) => {
                const i = Number(e.target.value)
                if (!isNaN(i) && i >= 0) {
                  setShowCreate(true)
                  // prefill modal by passing template later. For simplicity open modal and user can choose template manually.
                  // Optionally we could pass defaultTemplate prop to modal. Kept simple here.
                }
              }}>
                <option value="-1">Create from template...</option>
                {templates.map((t, idx) => <option key={idx} value={idx}>{t.title}</option>)}
              </select>
            </div>

            <button className="ap-btn ap-btn-primary" onClick={() => setShowCreate(true)}><PlusCircle className="icon" /> New</button>
          </div>
        </header>

        {/* Analytics */}
        <div className="ap-analytics">
          <div className="ap-stat-card">
            <div className="ap-stat-label">Active Projects</div>
            <div className="ap-stat-value">{analytics.active}</div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-label">Archived</div>
            <div className="ap-stat-value">{analytics.archived}</div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-label">Avg Completion</div>
            <div className="ap-stat-value">{analytics.avgCompletion}%</div>
          </div>
          <div className="ap-stat-card">
            <div className="ap-stat-label">Overloaded Students</div>
            <div className="ap-stat-value">{analytics.overloaded.count}</div>
            <div className="ap-stat-meta">&gt;{OVERLOAD_THRESHOLD} tasks</div>
          </div>
        </div>

        {/* Projects grid */}
        <div className="ap-grid">
          {filtered.length === 0 ? (
            <div className="ap-empty">
              <div>
                <div className="ap-empty-title">No projects yet</div>
                <div className="ap-empty-sub">Create projects from the admin panel. You can also import or use templates.</div>
                <div className="ap-empty-actions">
                  <button className="ap-btn ap-btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
                  <button className="ap-btn ap-btn-ghost" onClick={() => {
                    // sample: add demo project
                    const sample = {
                      id: uid("p"),
                      title: "Demo Project",
                      description: "A demo project created by admin",
                      deadline: "2025-12-25",
                      members: ["alice@example.com", "bob@example.com"],
                      tasks: [{ id: uid("t"), title: "Setup repo", assignee: "alice@example.com", status: "done" }, { id: uid("t2"), title: "Design", assignee: "bob@example.com", status: "in-progress" }],
                      status: "active",
                      createdAt: Date.now()
                    }
                    createProject(sample)
                  }}>Create demo</button>
                </div>
              </div>
            </div>
          ) : (
            filtered.map((p) => {
              const prog = projectProgress(p)
              // ===== THIS IS THE FIX =====
              // Check for 'deadline' first, then fall back to 'endDate' for compatibility.
              const deadlineValue = p.deadline || p.endDate;
              const formattedDeadline = formatDate(deadlineValue);
              return (
                <article key={p.id} className="ap-card">
                  <div className="ap-card-top">
                    <div>
                      <div className="ap-card-title">{p.title}</div>
                      <div className="ap-card-sub">{p.description}</div>
                    </div>
                    <div className="ap-card-actions">
                      <button className="ap-icon-btn" title="Archive" onClick={() => updateProject(p.id, { status: p.status === "archived" ? "active" : "archived" })}><Archive size={18} /></button>
                      <button className="ap-icon-btn text-red-600" title="Delete" onClick={() => setDeleteConfirm({ projectId: p.id, projectTitle: p.title })}><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <div className="ap-card-body">
                    <div className="ap-progress-mini">
                      <div className="ap-progress-mini-bar-outer"><div className="ap-progress-mini-bar-inner" style={{ width: `${prog.percent}%` }} /></div>
                      <div className="ap-progress-mini-text">{prog.percent}%</div>
                    </div>

                    <div className="ap-card-meta">
                      <div className="ap-members-inline">
                        {(p.members || []).slice(0, 6).map((m) => <div key={m} className="ap-avatar">{m.split("@")[0].slice(0,2).toUpperCase()}</div>)}
                        {(p.members || []).length > 6 && <div className="ap-more">+{(p.members || []).length - 6}</div>}
                        <div className="ap-member-count">{(p.members || []).length} members</div>
                      </div>

                      <div className="ap-task-counts">
                        <div className="ap-task-pill">To-do: {(p.tasks || []).filter(t => t.status === "todo").length}</div>
                        <div className="ap-task-pill">In-progress: {(p.tasks || []).filter(t => t.status === "in-progress").length}</div>
                        <div className="ap-task-pill">Done: {(p.tasks || []).filter(t => t.status === "done").length}</div>
                      </div>
                    </div>

                    <div className="ap-card-bottom">
                      <div className="ap-card-deadline">{formattedDeadline ? `Due ${formattedDeadline}` : "No deadline"}</div>
                      <button className="ap-btn ap-btn-sm" onClick={() => openDrawer(p.id)}><Users className="icon" /> View Details</button>
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </div>

        {/* Audit / right column compact */}
        <div className="ap-footer">
          <div className="ap-audit">
            <div className="ap-audit-title">Audit log</div>
            <div className="ap-audit-list">
              {audit.length === 0 && <div className="text-muted">No actions yet.</div>}
              {audit.map((a) => (
                <div key={a.id} className="ap-audit-item">
                  <div className="ap-audit-text">{a.text}</div>
                  <div className="ap-audit-time">{new Date(a.ts).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="ap-analytics-extra">
            <div className="ap-analytics-mini">
              <div className="ap-analytics-mini-title">Top overloaded</div>
              {Array.from(analytics.overloaded.map.entries()).slice(0,5).map(([email, count]) => (
                <div key={email} className="ap-overloaded-item">
                  <div className="ap-overloaded-email">{email}</div>
                  <div className="ap-overloaded-count">{count}</div>
                </div>
              ))}
              {analytics.overloaded.count === 0 && <div className="text-muted">No overloaded students</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && <CreateProjectModal defaultTemplate={null} onClose={() => setShowCreate(false)} onCreate={createProject} />}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          projectTitle={deleteConfirm.projectTitle}
          onConfirm={() => {
            updateProject(deleteConfirm.projectId, { delete: true })
            setDeleteConfirm(null)
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* Drawer */}
      {drawerProject && (
        <ProjectDrawer
          project={drawerProject}
          onClose={() => setDrawerProject(null)}
          onRemoveMember={removeMember}
          onAddTask={addTask}
          onUpdateProject={(id, patch) => {
            if (patch.delete) updateProject(id, patch)
            else updateProject(id, patch)
          }}
        />
      )}
    </div>
  )
}

/* ---------- Delete Confirmation Modal ---------- */
function DeleteConfirmModal({ projectTitle, onConfirm, onCancel }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-2xl p-6 shadow-2xl w-[440px] max-w-[92%]"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Delete Project</h3>
            <p className="text-sm text-slate-600 mt-2">
              Are you sure you want to delete <span className="font-semibold text-slate-900">"{projectTitle}"</span>? This action cannot be undone and all associated tasks will be permanently removed.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm"
          >
            Delete Project
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  )
}