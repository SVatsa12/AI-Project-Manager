// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/SidebarAdmin"
import Navbar from "../components/Navbar"
import { Users, BookOpen, BarChart2, Brain, PlusCircle, LogOut as LogOutIcon } from "lucide-react"
import { motion } from "framer-motion"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { useProjects } from "../contexts/ProjectsContext"

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/")
  }, [user, navigate])

  const { projects, createProject, addTask } = useProjects()

  // metrics
  const totalStudents = useMemo(() => new Set(projects.flatMap((p) => p.members || [])).size, [projects])
  const totalProjects = projects.length
  const avgFairness = useMemo(() => {
    if (!projects.length) return 0
    const arr = projects.map((p) => {
      const done = (p.tasks || []).filter((t) => t.status === "done").length
      const total = Math.max(1, (p.tasks || []).length)
      return Math.round((done / total) * 100)
    })
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
  }, [projects])

  // charts
  const tasksPerProject = projects.map((p) => ({ name: p.title, tasks: (p.tasks || []).length }))
  const contributions = (() => {
    const map = {}
    projects.forEach((p) => (p.tasks || []).forEach((t) => (map[t.assignee] = (map[t.assignee] || 0) + 1)))
    return Object.entries(map).map(([name, val]) => ({ name, val }))
  })()

  function runAISuggestions() {
    const low = projects.filter((p) => {
      const total = Math.max(1, (p.tasks || []).length)
      const done = (p.tasks || []).filter((t) => t.status === "done").length
      return done / total < 0.6
    })
    if (!low.length) return alert("No critical imbalances found.")
    alert(`AI suggests rebalancing ${low.length} project(s). Open Projects to review.`)
  }


  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div>{/* intentionally blank center area */}</div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white border border-slate-100 px-3 py-2 rounded-2xl shadow-sm">
              <div className="text-sm text-slate-600">{user?.email || "demo@example.com"}</div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={logout}
              className="ml-2 flex items-center gap-2 bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-full px-4 py-2"
              aria-label="Logout"
            >
              <LogOutIcon className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-medium text-indigo-600">Logout</span>
            </motion.button>
          </div>
        </div>

        <main className="p-8 space-y-8">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.name || "Admin"}</h1>
              <p className="text-slate-500 mt-1">Overview of projects, students and AI suggestions</p>
            </div>

            <div className="flex gap-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Active Students" value={totalStudents} icon={<Users className="w-5 h-5" />} />
                <StatCard label="Projects" value={totalProjects} icon={<BookOpen className="w-5 h-5" />} />
                <StatCard label="Avg Fairness" value={`${avgFairness}%`} icon={<BarChart2 className="w-5 h-5" />} />
                <StatCard label="AI Suggestions" value="Run" icon={<Brain className="w-5 h-5" />} />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* left/center column: Projects, Competitions, AI Insights */}
            <section className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <ProjectForm onCreate={createProject} />
                </div>

                <div className="space-y-4">
                  {projects.map((p) => (
                    <motion.div
                      key={p.id}
                      whileHover={{ translateY: -6, boxShadow: "0 14px 32px rgba(16,24,40,0.08)" }}
                      transition={{ type: "spring", stiffness: 220, damping: 18 }}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start justify-between gap-6 hover:shadow-lg transition"
                    >
                      {/* ===== START: UPDATED CODE ===== */}
                      {/* Left column for project details and progress (will grow) */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-indigo-600 truncate">{p.title}</div>
                        <div className="text-slate-600 text-sm mt-1 truncate">{p.description}</div>
                        <div className="text-xs text-slate-500 mt-1 truncate">
                          {p.techStack && <span>Tech: {p.techStack}</span>}
                          {p.startDate && <span className="ml-2">Start: {p.startDate}</span>}
                          {p.endDate && <span className="ml-2">End: {p.endDate}</span>}
                        </div>

                        <div className="mt-4">
                          {(() => {
                            const total = Math.max(1, (p.tasks || []).length)
                            const done = (p.tasks || []).filter((t) => t.status === "done").length
                            const percent = Math.round((done / total) * 100)
                            return (
                              <>
                                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                  <div style={{ width: `${percent}%` }} className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                                </div>
                                <div className="text-xs text-slate-500 mt-2">Progress: <span className="font-medium text-slate-700">{percent}%</span></div>
                              </>
                            )
                          })()}
                        </div>
                      </div>

                      {/* Right column for stats and controls (fixed width) */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-3 w-40">
                        <div className="text-xs text-slate-500 text-right">
                          <div>Max Members: <span className="text-slate-700 font-medium">{p.maxMembers || 'N/A'}</span></div>
                          <div className="mt-1">Current: <span className="text-slate-700 font-medium">{(p.members || []).length}</span></div>
                        </div>

                        <div className="flex flex-col gap-2 w-full mt-2">
                            <button
                                className="px-3 py-2 text-sm text-center rounded-lg border border-slate-200 hover:bg-slate-50 transition whitespace-nowrap"
                                onClick={() => addTask(p.id, { title: `Task ${Date.now() % 1000}`, assignee: p.members?.[0] || "" })}
                            >
                                + Task
                            </button>

                            <button
                                className="px-3 py-2 text-sm text-center rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow hover:opacity-95 transition whitespace-nowrap"
                                onClick={() => alert("Open project detail (demo)")}
                            >
                                Open
                            </button>
                        </div>
                      </div>
                      {/* ===== END: UPDATED CODE ===== */}
                    </motion.div>
                  ))}
                  {projects.length === 0 && <div className="text-slate-500">No projects yet — add one.</div>}
                </div>
              </div>


              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold mb-2">AI Insights</h3>
                <p className="text-slate-600">AI recommends rebalancing projects where completion is below 60%.</p>
                <div className="mt-4">
                  <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white" onClick={runAISuggestions}>Run suggestions</button>
                </div>
              </div>
            </section>

            {/* right column: charts ONLY (competitions removed from aside) */}
            <aside className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h4 className="text-sm text-slate-500 mb-3">Tasks per Project</h4>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tasksPerProject}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tasks" fill="#7c3aed" radius={[8, 8, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h4 className="text-sm text-slate-500 mb-3">Contributions (Top)</h4>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={contributions} dataKey="val" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28} paddingAngle={4}>
                        {contributions.map((_, i) => (
                          <Cell key={i} fill={["#7c3aed", "#34d399", "#fb7185", "#60a5fa", "#f59e0b"][i % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* intentionally removed small competitions corner widget */}
            </aside>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ===== small subcomponents ===== */

function StatCard({ label, value, icon }) {
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 min-w-[200px]">
      <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-inner">{icon}</div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
      </div>
    </div>
  )
}

function ProjectForm({ onCreate }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [techStack, setTechStack] = useState("")
  const [maxMembers, setMaxMembers] = useState("")
  const [desc, setDesc] = useState("")

  function handleCreate() {
    if (!title) return alert("Add a title")
    if (!startDate) return alert("Add a start date")
    if (!endDate) return alert("Add an end date")
    if (!maxMembers || isNaN(maxMembers) || parseInt(maxMembers) <= 0) return alert("Add a valid max number of members")
    
    onCreate({ 
      title, 
      startDate, 
      endDate, 
      techStack, 
      maxMembers: parseInt(maxMembers), 
      description: desc 
    })
    setTitle(""); setStartDate(""); setEndDate(""); setTechStack(""); setMaxMembers(""); setDesc(""); setOpen(false)
  }

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2">
        <PlusCircle className="w-4 h-4" /> New
      </button>
    )

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
        <div className="relative bg-white rounded-2xl shadow-xl w-[520px] p-6 z-10">
          <h3 className="text-lg font-semibold">Create Project</h3>
          <div className="mt-4 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project Title" className="w-full px-3 py-2 border rounded-lg" />
            <input value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start Date (YYYY-MM-DD)" className="w-full px-3 py-2 border rounded-lg" />
            <input value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End Date (YYYY-MM-DD)" className="w-full px-3 py-2 border rounded-lg" />
            <input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="Tech Stack Used (e.g., React, Node.js, Python)" className="w-full px-3 py-2 border rounded-lg" />
            <input value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} placeholder="Max Number of Members" type="number" min="1" className="w-full px-3 py-2 border rounded-lg" />
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description of the Project" className="w-full px-3 py-2 border rounded-lg" rows={3} />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setOpen(false)} className="px-3 py-1 border rounded-lg">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow">Create</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}