// src/components/ProjectTabs.jsx
import React, { useState, useEffect, useRef, useMemo } from "react"
import { motion } from "framer-motion"




import {
  Search,
  Filter,
  Circle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MessageCircle,
  Trash2,
  X,
  Users,
  Edit3,
  Send,
  UserCircle2,
} from "lucide-react"
import ProjectCard from "../components/ProjectCard";


/* ConfirmModal - small reusable confirm dialog */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* dialog */}
      <div className="relative z-10 w-[min(600px,90%)] bg-white rounded-xl shadow-xl ring-1 ring-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4">{message}</p>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Clearing...
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ProjectTabs
 * - Receives all state and handlers from StudentDashboard.jsx (keeps it dumb/presentational)
 * - Renders Profile / Projects / Task Board / Group Chat content
 * - Shows Join / Leave modals (Join/Leave actions are passed in)
 */
export default function ProjectTabs(props) {
  const {
    activeTab,
    user,
    profile = {},
    skills = [],
    interests = [],
    projects = [],
    myProjects = [],
    availableProjects = [],
    filteredProjects = [],
    activeProject,
    setActiveProject,
    getMessages,
    messagesEndRef,
    newMessage,
    setNewMessage,
    handleKeyPress,
    handleSendMessage,
    openJoinModal,
    openLeaveModal,
    showJoinModal,
    showLeaveModal,
    selectedProject,
    handleJoinProject,
    handleLeaveProject,
    isLoading,
    onDragStart,
    onDragOver,
    onDrop,
    updateTask,
    joinProject,
    leaveProject,
    clearChat, // <-- ensure StudentDashboard passes this prop
    onEditProfile, // <-- new prop to open edit profile UI handled by parent
    // optional callbacks for closing modals (parent should pass these if available)
    closeJoinModal,
    closeLeaveModal,
  } = props

  // Top-level UI state (hooks must be declared at top-level of component)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [taskView, setTaskView] = useState("all") // "all" | "todo" | "inprogress" | "done"
  const [updating, setUpdating] = useState(false) // moved from inside task renderer
  


const [progressMap, setProgressMap] = useState(() => {
  // initialize from myProjects so UI shows current persisted values
  const map = {};
  (myProjects || []).forEach(p => {
    const s = p?.userProgress?.[user.email];
    if (s) map[p.id] = s;
  });
  return map;
});

// Sync progressMap with myProjects whenever projects change
// This ensures the UI reflects backend updates
useEffect(() => {
  setProgressMap(prev => {
    const updated = { ...prev };
    (myProjects || []).forEach(p => {
      const persistedStatus = p?.userProgress?.[user.email];
      if (persistedStatus) {
        updated[p.id] = persistedStatus;
      }
    });
    return updated;
  });
}, [myProjects, user.email]);


const handleProgressChange = async (projectId, newStatus) => {
  // optimistic UI update
  setProgressMap(prev => ({ ...prev, [projectId]: newStatus }));

  // also call your persistence callback if present.
  // I try a few fallbacks so this works even if your API is different.
  try {
    setUpdating(true);

    // preferred: use setProjectProgress from ProjectsContext
    if (typeof props.setProjectProgress === "function") {
      await props.setProjectProgress(projectId, user.email, newStatus);
      setUpdating(false);
      return;
    }

    // fallback: if your updateTask supports project-level update when taskId is null
    if (typeof updateTask === "function") {
      await updateTask(projectId, null, { studentEmail: user.email, status: newStatus });
      setUpdating(false);
      return;
    }

    // otherwise: nothing to persist — optimistic only
    setUpdating(false);
  } catch (err) {
    console.error("Error updating progress:", err);
    // revert optimistic on error
    setProgressMap(prev => {
      const copy = { ...prev };
      // revert to project value if available
      const persisted = (projects || []).find(p => p.id === projectId)?.studentProgress?.[user.email]?.status;
      if (persisted) copy[projectId] = persisted;
      else delete copy[projectId];
      return copy;
    });
    setUpdating(false);
    window.alert("Could not update progress. Try again.");
  }
}

  // Helpers for task progress mapping
  const getProgressPercentage = (status) => {
    switch (status) {
      case "not-started":
        return 0
      case "in-progress":
        return 40
      case "almost-done":
        return 80
      case "completed":
        return 100
      default:
        return 0
    }
  }

  const getProgressLabel = (status) => {
    switch (status) {
      case "not-started":
        return "Not Started"
      case "in-progress":
        return "In Progress"
      case "almost-done":
        return "Almost Done"
      case "completed":
        return "Completed"
      default:
        return "Not Started"
    }
  }

  // --- Render helpers (no hooks inside these) --- //

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Profile Information</h3>

          {/* Edit profile button is now rendered here and delegated to parent via onEditProfile */}
          <div>
            {onEditProfile ? (
              <button
                onClick={() => onEditProfile()}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition text-sm"
                aria-label="Edit profile"
                title="Edit profile"
              >
                <Edit3 className="w-4 h-4 text-slate-600" />
                <span className="text-slate-700">Edit</span>
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Name</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">{profile.name || user?.name || "Not set"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Email</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">{profile.email || user?.email || "Not set"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">Year</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">{profile.year || "Not set"}</div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Department</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">{profile.department || "Not set"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-600">College</label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg">{profile.college || "Not set"}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">Skills</h4>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No skills added yet</p>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">Interest Areas</h4>
            <div className="flex flex-wrap gap-2">
              {interests.length > 0 ? (
                interests.map((interest, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-slate-500 text-sm">No interests added yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderProjectsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Projects</h3>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects..."
                onChange={(e) => {
                  // parent controls searchQuery; if needed add a callback prop later
                }}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-600" />
              <select className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" defaultValue="all">
                <option value="all">All Projects</option>
                <option value="enrolled">My Projects</option>
                <option value="available">Available</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => {
            const isEnrolled = myProjects.some(mp => mp.id === p.id)
            return (
              <motion.div
                key={p.id}
                whileHover={{ translateY: -4, boxShadow: "0 20px 40px rgba(16,24,40,0.1)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg transition"
              >
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg">{p.title}</h4>
                    <p className="text-sm text-slate-600 mt-1">{p.description}</p>
                  </div>

                  <div className="space-y-2 text-xs text-slate-500">
                    {p.techStack && <div>Tech: {p.techStack}</div>}
                    {p.startDate && <div>Start: {p.startDate}</div>}
                    {p.endDate && <div>End: {p.endDate}</div>}
                    <div>Members: {(p.members || []).length}/{p.maxMembers}</div>
                  </div>

                  {isEnrolled && (
                    <div className="pt-2">
                      <div className="text-xs text-slate-500 mb-1">Progress</div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        {(() => {
                          // Use userProgress status if available, otherwise fall back to task completion
                          const userStatus = progressMap[p.id] || p.userProgress?.[user.email];
                          let progressPct = 0;
                          
                          if (userStatus) {
                            // Use status-based progress
                            progressPct = getProgressPercentage(userStatus);
                          } else {
                            // Fall back to task-based progress
                            const doneTasks = (p.tasks || []).filter((t) => t.status === "done").length;
                            const totalTasks = (p.tasks || []).length;
                            progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                          }
                          
                          return (
                            <div
                              className="h-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {isEnrolled ? (
                      <>
                        <button
                          onClick={() => setActiveProject(p.id)}
                          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                        >
                          Chat
                        </button>
                        {/* <button
                        onClick={() => } >
                           Manage
                           </button> */}
                        <button
                          onClick={() => openLeaveModal(p)}
                          className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition"
                        >
                          Leave
                        </button>
  
                      </>
                    ) : (
                      <button
                        onClick={() => openJoinModal(p)}
                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition"
                      >
                        Join Project
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 mb-2">📋</div>
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No Projects Found</h3>
            <p className="text-slate-500">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm">
        <h3 className="text-xl font-semibold mb-6">Settings</h3>

        {/* Theme Selection */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg text-slate-700">Appearance</h4>
          <p className="text-sm text-slate-500 mb-3">Choose your preferred theme mode.</p>
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Light Mode</button>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50">Dark Mode</button>
          </div>
        </div>

        {/* Password Change */}
        <div className="space-y-4 mt-8">
          <h4 className="font-semibold text-lg text-slate-700">Change Password</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="password" placeholder="Current password" className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <input type="password" placeholder="New password" className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            <input type="password" placeholder="Confirm new password" className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">Update Password</button>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4 mt-8">
          <h4 className="font-semibold text-lg text-slate-700">Notifications</h4>
          <p className="text-sm text-slate-500 mb-3">Control which updates you want to receive.</p>
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600" defaultChecked />
              <span>Email updates about new projects</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600" defaultChecked />
              <span>Task progress notifications</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 text-indigo-600" />
              <span>Chat message alerts</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTaskBoardTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm">
          <h3 className="text-xl font-semibold mb-6">My Hackathon Progress</h3>

          {myProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myProjects.map((project) => {
                const studentStatus =
                  progressMap[project.id] ||
                  project.userProgress?.[user.email] || 
                  "not_started"
                const progressPct = getProgressPercentage(studentStatus)

                return (
                  <div
                    key={project.id}
                    className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm"
                  >
                    <h4 className="font-semibold text-lg mb-2">{project.title}</h4>
                    <p className="text-sm text-slate-500 mb-4">{project.description}</p>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-3">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          progressPct === 100
                            ? "bg-gradient-to-r from-emerald-500 to-green-600"
                            : progressPct >= 80
                            ? "bg-gradient-to-r from-blue-400 to-blue-500"
                            : progressPct >= 40
                            ? "bg-gradient-to-r from-amber-400 to-orange-500"
                            : "bg-gradient-to-r from-slate-300 to-slate-400"
                        }`}
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-600">
                        Status:{" "}
                        <span className="font-medium">
                          {getProgressLabel(studentStatus)}
                        </span>
                      </div>

                      <select
                        value={studentStatus}
                        onChange={(e) =>
                          handleProgressChange(project.id, e.target.value)
                        }
                        disabled={updating}
                        className="border border-slate-200 rounded-md text-sm px-2 py-1 focus:ring-indigo-500"
                      >
                        <option value="not-started">Not Started</option>
                        <option value="in-progress">In Progress</option>
                        <option value="almost-done">Almost Done</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>

                    {progressPct === 100 && (
                      <div className="mt-3 text-xs text-green-600 font-medium">
                        ✅ Great work! You've completed this hackathon.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-2 text-3xl">📋</div>
              <h3 className="text-lg font-semibold text-slate-600 mb-2">
                No projects joined yet
              </h3>
              <p className="text-slate-500">
                Join a hackathon or competition to track your progress here!
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Group Chat rendering uses top-level confirmOpen/clearing state
  const renderGroupChatTab = () => {
    const currentProject = myProjects.find((p) => p.id === activeProject)
    const messages = getMessages(activeProject) || []

    // Helper to get initials from email
    const getInitials = (email) => {
      const name = email?.split("@")[0] || "?"
      return name.slice(0, 2).toUpperCase()
    }

    // Helper to get a consistent color for each user
    const getUserColor = (email) => {
      const colors = [
        "bg-gradient-to-br from-violet-500 to-purple-600",
        "bg-gradient-to-br from-blue-500 to-cyan-600",
        "bg-gradient-to-br from-emerald-500 to-teal-600",
        "bg-gradient-to-br from-orange-500 to-red-600",
        "bg-gradient-to-br from-pink-500 to-rose-600",
        "bg-gradient-to-br from-amber-500 to-yellow-600",
      ]
      const hash = email?.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0
      return colors[hash % colors.length]
    }

    // open confirm dialog
    const onRequestClear = () => {
      if (!activeProject) return
      setConfirmOpen(true)
    }

    // user pressed confirm -> call clearChat
    const handleConfirmClear = async () => {
      if (!activeProject) {
        setConfirmOpen(false)
        return
      }
      setClearing(true)
      try {
        // call the context function passed from StudentDashboard
        await clearChat(activeProject)
        setConfirmOpen(false)
        // optional: scroll to bottom or show a subtle toast here
        messagesEndRef?.current?.scrollIntoView({ behavior: "smooth" })
      } catch (err) {
        console.error("Failed to clear chat:", err)
        // fallback alert (or use your toast)
        window.alert("Could not clear chat. Try again.")
      } finally {
        setClearing(false)
      }
    }

    const handleCancelClear = () => {
      setConfirmOpen(false)
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-100">
          {!activeProject ? (
            <div className="p-16 text-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
              <div className="relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl" />
                </div>
                <MessageCircle className="w-20 h-20 text-indigo-400 mx-auto mb-6 relative" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
                Select a Project
              </h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Choose a project from the Projects tab to start chatting with your team members in real-time.
              </p>
            </div>
          ) : (
            <>
              {/* Modern Header with Gradient */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-white">{currentProject?.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="w-4 h-4 text-white/80" />
                        <p className="text-sm text-white/90">
                          {currentProject?.members?.length || 0} {currentProject?.members?.length === 1 ? "member" : "members"} in this group
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={onRequestClear}
                      disabled={clearing}
                      title="Clear chat history"
                      aria-label="Clear chat"
                      className={
                        "p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white transition " +
                        (clearing ? "opacity-60 cursor-not-allowed" : "")
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setActiveProject(null)}
                      className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg text-white transition"
                      title="Close chat"
                      aria-label="Close chat"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>

                {/* Member Pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {currentProject?.members?.map((member, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full"
                    >
                      <div className={`w-6 h-6 rounded-full ${getUserColor(member)} flex items-center justify-center text-xs font-semibold text-white shadow-sm`}>
                        {getInitials(member)}
                      </div>
                      <span className="text-sm text-white/90">{member.split("@")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Messages Area with Modern Styling */}
              <div className="h-[500px] overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
                {messages.length > 0 ? (
                  messages.map((message, idx) => {
                    const isOwn = message.sender === user.email
                    const showAvatar = idx === 0 || messages[idx - 1].sender !== message.sender
                    
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-end gap-2 ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        {!isOwn && (
                          <div className={`w-8 h-8 rounded-full ${getUserColor(message.sender)} flex items-center justify-center text-xs font-semibold text-white shadow-md ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                            {getInitials(message.sender)}
                          </div>
                        )}
                        
                        <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                          {showAvatar && !isOwn && (
                            <span className="text-xs font-medium text-slate-600 mb-1 px-1">
                              {message.sender?.split("@")[0]}
                            </span>
                          )}
                          
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              isOwn
                                ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-sm"
                                : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm"
                            }`}
                          >
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {message.text}
                            </div>
                          </div>
                          
                          <div className={`text-xs mt-1 px-1 ${isOwn ? "text-indigo-400" : "text-slate-400"}`}>
                            {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </div>
                        </div>

                        {isOwn && (
                          <div className={`w-8 h-8 rounded-full ${getUserColor(message.sender)} flex items-center justify-center text-xs font-semibold text-white shadow-md ${showAvatar ? "opacity-100" : "opacity-0"}`}>
                            {getInitials(message.sender)}
                          </div>
                        )}
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-2xl" />
                        </div>
                        <MessageCircle className="w-16 h-16 mx-auto text-slate-300 relative" />
                      </div>
                      <p className="text-slate-500 font-medium mb-2">No messages yet</p>
                      <p className="text-sm text-slate-400">Start the conversation with your team!</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Modern Input Area */}
              <div className="border-t border-slate-200 p-4 bg-white">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="w-full px-5 py-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-all text-sm placeholder:text-slate-400"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:shadow-none font-medium"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </motion.button>
                </div>
                
                {/* Optional: Hint text */}
                <p className="text-xs text-slate-400 mt-2 px-1">
                  Press Enter to send • Only group members can see these messages
                </p>
              </div>
            </>
          )}
        </div>

        {/* Confirm modal */}
        <ConfirmModal
          open={confirmOpen}
          title="Clear chat history?"
          message="This will remove all messages for everyone in this project. This action cannot be undone."
          confirmLabel="Clear chat"
          cancelLabel="Cancel"
          loading={clearing}
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      </div>
    )
  }

  // --- main render --- //
  return (
    <div>
      {activeTab === "profile" && renderProfileTab()}
      {activeTab === "projects" && renderProjectsTab()}
      {activeTab === "tasks" && renderTaskBoardTab()}
      {activeTab === "chat" && renderGroupChatTab()}

      {/* Join Modal */}
      {showJoinModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              // call parent's close handler if present
              if (typeof closeJoinModal === "function") closeJoinModal()
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-[500px] p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg"><Users className="w-5 h-5 text-indigo-600" /></div>
              <h3 className="text-xl font-semibold">Join Project</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{selectedProject.title}</h4>
                <p className="text-slate-600 mt-1">{selectedProject.description}</p>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Technology Stack:</span>
                  <span className="font-medium">{selectedProject.techStack || "Not specified"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Duration:</span>
                  <span className="font-medium">
                    {selectedProject.startDate && selectedProject.endDate ? `${selectedProject.startDate} - ${selectedProject.endDate}` : "TBD"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Current Members:</span>
                  <span className="font-medium">{selectedProject.members?.length || 0}/{selectedProject.maxMembers}</span>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                Are you sure you want to join this project? You'll be able to collaborate with other team members and work on tasks.
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (typeof closeJoinModal === "function") closeJoinModal()
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleJoinProject}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <> <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining... </> : 'Join Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (typeof closeLeaveModal === "function") closeLeaveModal()
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-[500px] p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg"><Users className="w-5 h-5 text-red-600" /></div>
              <h3 className="text-xl font-semibold">Leave Project</h3>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{selectedProject.title}</h4>
                <p className="text-slate-600 mt-1">{selectedProject.description}</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-red-600 mt-0.5">⚠️</div>
                  <div>
                    <h5 className="font-semibold text-red-800 mb-1">Are you sure?</h5>
                    <p className="text-sm text-red-700">
                      You will lose access to all project tasks and won't be able to collaborate with the team anymore. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  if (typeof closeLeaveModal === "function") closeLeaveModal()
                }}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveProject}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? <> <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Leaving... </> : 'Leave Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}