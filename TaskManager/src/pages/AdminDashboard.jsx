// src/pages/AdminDashboard.jsx
import React, { useEffect, useMemo, useState } from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/SidebarAdmin"
import Navbar from "../components/Navbar"
import { Users, BookOpen, BarChart2, Brain, PlusCircle, LogOut as LogOutIcon, X, Loader2, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
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
import { useProjectsBackend } from "../contexts/ProjectsBackendContext"

// Utility to generate unique IDs
function uid(prefix = "id") {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`
}

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [aiInsights, setAIInsights] = useState(null)
  const [loadingAI, setLoadingAI] = useState(false)
  
  useEffect(() => {
    if (!user || user.role !== "admin") navigate("/")
  }, [user, navigate])

  const { projects, createProject, addTask } = useProjectsBackend()

  // metrics
  const totalStudents = useMemo(() => new Set(projects.flatMap((p) => p.members || [])).size, [projects])
  const totalProjects = projects.length
  
  // Average completion based on student progress across all projects
  const avgCompletion = useMemo(() => {
    if (!projects.length) return 0
    
    let totalStudentSlots = 0
    let totalCompletionScore = 0
    
    projects.forEach(p => {
      const members = p.members || []
      const userProgress = p.userProgress || {}
      
      members.forEach(email => {
        totalStudentSlots++
        const status = userProgress[email] || "not-started"
        
        // Weight each status for average calculation
        if (status === "completed") totalCompletionScore += 100
        else if (status === "almost-done") totalCompletionScore += 80
        else if (status === "in-progress") totalCompletionScore += 40
        else totalCompletionScore += 0
      })
    })
    
    return totalStudentSlots > 0 ? Math.round(totalCompletionScore / totalStudentSlots) : 0
  }, [projects])

  // charts
  const tasksPerProject = projects.map((p) => ({ name: p.title, tasks: (p.tasks || []).length }))
  
  // Student status distribution across all projects
  const studentStatusData = useMemo(() => {
    const statusCounts = {
      "Completed": 0,
      "Almost Done": 0,
      "In Progress": 0,
      "Not Started": 0
    }
    
    projects.forEach(p => {
      const userProgress = p.userProgress || {}
      const members = p.members || []
      
      members.forEach(email => {
        const status = userProgress[email] || "not-started"
        if (status === "completed") statusCounts["Completed"]++
        else if (status === "almost-done") statusCounts["Almost Done"]++
        else if (status === "in-progress") statusCounts["In Progress"]++
        else statusCounts["Not Started"]++
      })
    })
    
    return [
      { name: "Completed", value: statusCounts["Completed"], color: "#10b981" },
      { name: "Almost Done", value: statusCounts["Almost Done"], color: "#60a5fa" },
      { name: "In Progress", value: statusCounts["In Progress"], color: "#f59e0b" },
      { name: "Not Started", value: statusCounts["Not Started"], color: "#94a3b8" }
    ].filter(item => item.value > 0)
  }, [projects])
  
  // Project completion rates
  const projectCompletionData = useMemo(() => {
    return projects.map(p => {
      const members = p.members || []
      const userProgress = p.userProgress || {}
      const completedCount = members.filter(email => 
        userProgress[email] === "completed" || 
        userProgress[email] === "almost-done"
      ).length
      const completionRate = members.length > 0 ? Math.round((completedCount / members.length) * 100) : 0
      
      return {
        name: p.title.length > 15 ? p.title.substring(0, 15) + "..." : p.title,
        completion: completionRate
      }
    })
  }, [projects])

  async function runAISuggestions() {
    setShowAIInsights(true)
    setLoadingAI(true)
    setAIInsights(null)
    
    try {
      // Prepare project data for AI analysis
      const projectAnalysis = projects.map(p => {
        const members = p.members || []
        const studentProgress = p.studentProgress || {}
        const tasks = p.tasks || []
        
        const statusCounts = {
          completed: 0,
          almostDone: 0,
          inProgress: 0,
          notStarted: 0
        }
        
        members.forEach(email => {
          const status = studentProgress[email]?.status || "not-started"
          if (status === "completed") statusCounts.completed++
          else if (status === "almost-done") statusCounts.almostDone++
          else if (status === "in-progress") statusCounts.inProgress++
          else statusCounts.notStarted++
        })
        
        const taskCompletion = {
          total: tasks.length,
          done: tasks.filter(t => t.status === "done").length,
          inProgress: tasks.filter(t => t.status === "in-progress").length,
          todo: tasks.filter(t => t.status === "todo").length
        }
        
        return {
          title: p.title,
          startDate: p.startDate,
          endDate: p.endDate,
          maxMembers: p.maxMembers,
          currentMembers: members.length,
          studentStatus: statusCounts,
          taskStatus: taskCompletion,
          techStack: p.techStack
        }
      })
      
      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4003"
      
      const response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `You are an AI project management advisor for a hackathon/project management platform. Analyze the following projects and provide 3-5 actionable insights and recommendations to improve project outcomes, student engagement, and overall success.

Project Data:
${JSON.stringify(projectAnalysis, null, 2)}

Total Students: ${totalStudents}
Total Projects: ${totalProjects}

Please provide:
1. Overall health assessment
2. Specific projects that need attention
3. Student engagement insights
4. Actionable recommendations to improve completion rates
5. Resource allocation suggestions

Format your response in clear sections with headers. Use single asterisks (*) for bullet points only. Do not use ** for emphasis. Be specific and actionable.`
        })
      })
      
      if (!response.ok) throw new Error("Failed to get AI insights")
      
      const data = await response.json()
      let insights = data.reply || data.message || "No insights available"
      
      // Clean up excessive markdown formatting
      insights = insights
        .replace(/\*\*\*/g, '') // Remove triple asterisks
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove double asterisks but keep the text
        .replace(/\* \*\*/g, '• ') // Convert "* **" to bullet
        .replace(/^\*\*/gm, '') // Remove ** at start of lines
        .trim()
      
      setAIInsights(insights)
      
    } catch (error) {
      console.error("AI Insights Error:", error)
      setAIInsights("❌ Failed to generate insights. Please try again later.")
    } finally {
      setLoadingAI(false)
    }
  }

  // new logout handler: clear auth, navigate to landing, open large auth modal in login mode
  async function handleLogout() {
    try {
      // call context logout (may be sync or async)
      await logout?.()
    } catch (err) {
      console.warn("Logout error (ignored):", err)
    } finally {
      // ensure we land on home/landing page
      navigate("/")

      // ask LandingPage to open AuthModal in "login" mode
      window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: "login" } }))
    }
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
              onClick={handleLogout}
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
              <h1 className="text-3xl font-bold text-slate-800">Welcome,Admin</h1>
              <p className="text-slate-500 mt-1">Overview of projects, students and AI suggestions</p>
            </div>

            <div className="flex gap-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard label="Active Students" value={totalStudents} icon={<Users className="w-5 h-5" />} />
                <StatCard label="Projects" value={totalProjects} icon={<BookOpen className="w-5 h-5" />} />
                <StatCard label="Avg Completion" value={`${avgCompletion}%`} icon={<BarChart2 className="w-5 h-5" />} />
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
                            // Student progress (primary metric)
                            const userProgress = p.userProgress || {}
                            const members = p.members || []
                            
                            // Count students by status
                            const statusCounts = {
                              completed: 0,
                              "almost-done": 0,
                              "in-progress": 0,
                              "not-started": 0
                            }
                            
                            members.forEach(email => {
                              const status = userProgress[email] || "not-started"
                              statusCounts[status] = (statusCounts[status] || 0) + 1
                            })
                            
                            const totalMembers = members.length || 1
                            const completedPercent = (statusCounts.completed / totalMembers) * 100
                            const almostDonePercent = (statusCounts["almost-done"] / totalMembers) * 100
                            const inProgressPercent = (statusCounts["in-progress"] / totalMembers) * 100
                            const notStartedPercent = (statusCounts["not-started"] / totalMembers) * 100
                            
                            // Overall completion percentage
                            const overallPercent = Math.round((completedPercent + almostDonePercent * 0.75 + inProgressPercent * 0.5 + notStartedPercent * 0) / 100 * 100)
                            
                            // Task progress (secondary metric)
                            const total = Math.max(1, (p.tasks || []).length)
                            const done = (p.tasks || []).filter((t) => t.status === "done").length
                            const taskPercent = Math.round((done / total) * 100)
                            
                            return (
                              <>
                                {/* Multi-segment progress bar */}
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                                  {completedPercent > 0 && (
                                    <div 
                                      style={{ width: `${completedPercent}%` }} 
                                      className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                                      title={`${statusCounts.completed} completed`}
                                    />
                                  )}
                                  {almostDonePercent > 0 && (
                                    <div 
                                      style={{ width: `${almostDonePercent}%` }} 
                                      className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-500"
                                      title={`${statusCounts["almost-done"]} almost done`}
                                    />
                                  )}
                                  {inProgressPercent > 0 && (
                                    <div 
                                      style={{ width: `${inProgressPercent}%` }} 
                                      className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
                                      title={`${statusCounts["in-progress"]} in progress`}
                                    />
                                  )}
                                  {notStartedPercent > 0 && (
                                    <div 
                                      style={{ width: `${notStartedPercent}%` }} 
                                      className="h-full bg-gradient-to-r from-slate-300 to-slate-400 transition-all duration-500"
                                      title={`${statusCounts["not-started"]} not started`}
                                    />
                                  )}
                                </div>
                                <div className="text-xs text-slate-500 mt-2 flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-slate-700">{overallPercent}% complete</span>
                                    {members.length > 0 && (
                                      <span className="ml-2">
                                        ({statusCounts.completed + statusCounts["almost-done"]}/{members.length} students)
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {statusCounts.completed > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px]">{statusCounts.completed} done</span>
                                      </div>
                                    )}
                                    {statusCounts["almost-done"] > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                        <span className="text-[10px]">{statusCounts["almost-done"]} almost</span>
                                      </div>
                                    )}
                                    {statusCounts["in-progress"] > 0 && (
                                      <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                                        <span className="text-[10px]">{statusCounts["in-progress"]} working</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
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
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Student Status Distribution</h4>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={studentStatusData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={70} 
                        innerRadius={35} 
                        paddingAngle={2}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        labelLine={{ stroke: '#64748b', strokeWidth: 1 }}
                      >
                        {studentStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value} students`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {studentStatusData.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-8">
                    No student data yet
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm">
                <h4 className="text-sm font-semibold text-slate-700 mb-4">Project Completion Rates</h4>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectCompletionData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Bar dataKey="completion" fill="#7c3aed" radius={[8, 8, 0, 0]} barSize={40}>
                        {projectCompletionData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.completion === 100 ? "#10b981" : 
                              entry.completion >= 75 ? "#60a5fa" : 
                              entry.completion >= 40 ? "#f59e0b" : 
                              "#94a3b8"
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {projectCompletionData.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-8">
                    No projects yet
                  </div>
                )}
              </div>

              {/* intentionally removed small competitions corner widget */}
            </aside>
          </div>
        </main>
      </div>
      
      {/* AI Insights Modal */}
      <AnimatePresence>
        {showAIInsights && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !loadingAI && setShowAIInsights(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">AI-Powered Insights</h2>
                </div>
                {!loadingAI && (
                  <button
                    onClick={() => setShowAIInsights(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                {loadingAI ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <p className="text-slate-600 text-lg font-medium">Analyzing your projects...</p>
                    <p className="text-slate-400 text-sm mt-2">Generating personalized insights</p>
                  </div>
                ) : aiInsights ? (
                  <div className="prose prose-slate max-w-none">
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-6">
                      <p className="text-sm text-slate-600 m-0">
                        <strong className="text-indigo-700">📊 Analysis based on:</strong> {totalProjects} projects, {totalStudents} students
                      </p>
                    </div>
                    <div className="space-y-4">
                      {aiInsights.split('\n').map((line, idx) => {
                        // Skip empty lines
                        if (!line.trim()) return null
                        
                        // Check if it's a numbered section (1., 2., etc.)
                        if (/^\d+\./.test(line.trim())) {
                          return (
                            <h3 key={idx} className="text-lg font-semibold text-indigo-700 mt-6 mb-2">
                              {line.trim()}
                            </h3>
                          )
                        }
                        
                        // Check if it's a bullet point
                        if (line.trim().startsWith('•') || line.trim().startsWith('*')) {
                          return (
                            <div key={idx} className="flex gap-2 ml-4">
                              <span className="text-indigo-500 font-bold">•</span>
                              <p className="text-slate-700 m-0 flex-1">{line.replace(/^[•*]\s*/, '').trim()}</p>
                            </div>
                          )
                        }
                        
                        // Regular paragraph
                        return (
                          <p key={idx} className="text-slate-700 leading-relaxed m-0">
                            {line.trim()}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-slate-500">No insights available</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!loadingAI && aiInsights && (
                <div className="border-t border-slate-200 px-6 py-4 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">Powered by Google Gemini AI</p>
                    <button
                      onClick={() => setShowAIInsights(false)}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
  const [submitting, setSubmitting] = useState(false)

  async function handleCreate() {
    if (submitting) return // Prevent double submission
    if (!title) return alert("Add a title")
    if (!startDate) return alert("Add a start date")
    if (!endDate) return alert("Add an end date")
    if (!maxMembers || isNaN(maxMembers) || parseInt(maxMembers) <= 0) return alert("Add a valid max number of members")
    
    setSubmitting(true)
    try {
      await onCreate({ 
        id: uid("p"),
        title, 
        startDate, 
        endDate, 
        techStack, 
        maxMembers: parseInt(maxMembers), 
        description: desc,
        members: [],
        tasks: [],
        status: "active",
        createdAt: Date.now()
      })
      setTitle(""); setStartDate(""); setEndDate(""); setTechStack(""); setMaxMembers(""); setDesc(""); setOpen(false)
    } catch (err) {
      console.error('Error creating project:', err)
    } finally {
      setSubmitting(false)
    }
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
              <button 
                onClick={() => setOpen(false)} 
                disabled={submitting}
                className="px-3 py-1 border rounded-lg disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate} 
                disabled={submitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
