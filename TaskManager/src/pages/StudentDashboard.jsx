// src/pages/StudentDashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react"
import { useAuth } from "../auth/AuthContext"
import { useNavigate } from "react-router-dom"
import Sidebar from "../components/SidebarStudent"
import { motion } from "framer-motion"
import ProjectCard from "../components/ProjectCard";
import {
  ClipboardList,
  Users,
  FolderOpen,
  BarChart3,
  MessageCircle,
  LogOut as LogOutIcon,
  Settings,
  Trophy,
} from "lucide-react"

import StatCard from "../components/StatCard"
import ProjectTabs from "../components/ProjectTabs"
import EditProfileModal from "../components/EditProfileModal"

// Proper ES module imports for contexts:
import { useProjectsBackend } from "../contexts/ProjectsBackendContext"
import { useCompetitions } from "../contexts/CompetitionsContext"
import { useStudent } from "../contexts/StudentContext"
import { useChat } from "../contexts/ChatContext"
import { apiFetch } from "../lib/api"

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user || user.role !== "student") {
      navigate("/")
    }
  }, [user, navigate])

  // Contexts
  const { projects, updateProject, addTask, updateTask } = useProjectsBackend()
  const { competitions: persistedCompetitions = [], enroll, unenroll, refresh: refreshCompetitions } = useCompetitions()
  const { profile, skills, interests, updateProfile, addSkill, removeSkill, addInterest, removeInterest } = useStudent()
  const { activeProject, setActiveProject, sendMessage, getMessages, clearChat } = useChat()

  // State
  const [activeTab, setActiveTab] = useState("profile")
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [projectFilter, setProjectFilter] = useState("all") // all, enrolled, available
  const [searchQuery, setSearchQuery] = useState("")
  const [newMessage, setNewMessage] = useState("")
  const [draggedTask, setDraggedTask] = useState(null)
  const messagesEndRef = useRef(null)

  // Lifted task view state so selection persists across tabs
  // Values: "all" | "todo" | "inprogress" | "done"
  const [taskView, setTaskView] = useState("all")

  // Normalized student email
  const studentEmail = (user?.email || "").toLowerCase().trim()

  // Derived data
  const myProjects = useMemo(
    () =>
      (projects || []).filter((p) =>
        (p.members || []).some((m) => String(m || "").toLowerCase().trim() === studentEmail)
      ),
    [projects, studentEmail]
  )

  const availableProjects = useMemo(
    () =>
      (projects || []).filter((p) => {
        const isMember = (p.members || []).some((m) => String(m || "").toLowerCase().trim() === studentEmail)
        const hasSpace = (p.members || []).length < p.maxMembers
        return !isMember && hasSpace
      }),
    [projects, studentEmail]
  )

  const filteredProjects = useMemo(() => {
    let filtered = []
    switch (projectFilter) {
      case "enrolled":
        filtered = myProjects
        break
      case "available":
        filtered = availableProjects
        break
      default:
        filtered = [...myProjects, ...availableProjects]
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        (p.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((p.techStack || "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    return filtered
  }, [myProjects, availableProjects, projectFilter, searchQuery])

  // Stats
  const totalTasks = myProjects.reduce((acc, p) => acc + (p.tasks || []).filter((t) => (t.assignee || "") === (user?.email || "")).length, 0)
  const completedTasks = myProjects.reduce((acc, p) => acc + (p.tasks || []).filter((t) => (t.assignee || "") === (user?.email || "") && t.status === "done").length, 0)

  // Auto-scroll chat to bottom
  const messages = getMessages(activeProject) || []
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [activeProject, messages.length])

  // Modal handlers
  function openJoinModal(project) {
    setSelectedProject(project)
    setShowJoinModal(true)
  }

  function openLeaveModal(project) {
    setSelectedProject(project)
    setShowLeaveModal(true)
  }

  function closeJoinModal() {
    setShowJoinModal(false)
    setSelectedProject(null)
  }

  function closeLeaveModal() {
    setShowLeaveModal(false)
    setSelectedProject(null)
  }

  async function handleJoinProject() {
    if (!selectedProject) return

    setIsLoading(true)
    try {
      const updatedMembers = [...(selectedProject.members || []), user.email]
      await updateProject(selectedProject.id, { members: updatedMembers })
      setShowJoinModal(false)
      setSelectedProject(null)
    } catch (error) {
      console.error("Failed to join project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLeaveProject() {
    if (!selectedProject) return

    setIsLoading(true)
    try {
      const updatedMembers = (selectedProject.members || []).filter(m => m !== user.email)
      await updateProject(selectedProject.id, { members: updatedMembers })
      setShowLeaveModal(false)
      setSelectedProject(null)
    } catch (error) {
      console.error("Failed to leave project:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // Chat handlers
  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeProject) return
    sendMessage(activeProject, newMessage.trim(), user.email)
    setNewMessage("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e, task, projectId) => {
    setDraggedTask({ ...task, projectId })
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e, newStatus, projectId) => {
    e.preventDefault()
    if (draggedTask && draggedTask.projectId === projectId) {
      updateTask(projectId, draggedTask.id, { status: newStatus })
    }
    setDraggedTask(null)
  }

  // Set project progress for a student
  const setProjectProgress = async (projectId, userEmail, status) => {
    try {
      const project = projects.find(p => p.id === projectId)
      if (!project) return

      // userProgress is a plain object, not a Map
      const updatedProgress = {
        ...(project.userProgress || {}),
        [userEmail]: status
      }
      
      await updateProject(projectId, { 
        userProgress: updatedProgress
      })
    } catch (error) {
      console.error('Failed to update project progress:', error)
    }
  }

  // Direct join/leave functions (for components that don't use modals)
  const joinProject = async (projectId, userEmail) => {
    try {
      const project = projects.find(p => p.id === projectId)
      if (!project) return

      const members = project.members || []
      if (members.includes(userEmail)) return
      if (members.length >= project.maxMembers) {
        throw new Error('Project is full')
      }

      await updateProject(projectId, { members: [...members, userEmail] })
    } catch (error) {
      console.error('Failed to join project:', error)
      throw error
    }
  }

  const leaveProject = async (projectId, userEmail) => {
    try {
      const project = projects.find(p => p.id === projectId)
      if (!project) return

      const updatedMembers = (project.members || []).filter(m => m !== userEmail)
      await updateProject(projectId, { members: updatedMembers })
    } catch (error) {
      console.error('Failed to leave project:', error)
      throw error
    }
  }

  // EditProfileModal save handler: patch profile + sync skills/interests
  const handleSaveProfile = async (data) => {
    try {
      // Send update to backend API
      const updates = {
        name: data.profile?.name || user?.name,
        skills: data.skills || [],
        profile: data.profile || {},
      }

      console.log("[StudentDashboard] Updating profile:", updates)
      console.log("[StudentDashboard] Calling: PUT /api/auth/me")
      console.log("[StudentDashboard] Token:", localStorage.getItem('gpa_token')?.substring(0, 20) + '...')
      
      const result = await apiFetch("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify(updates),
      })

      console.log("[StudentDashboard] Profile updated successfully:", result)

      // Update local context
      if (data.profile) updateProfile(data.profile)

      // Sync skills: remove missing, add new
      const newSkills = data.skills || []
      const prevSkills = skills || []
      prevSkills.forEach((s) => {
        if (!newSkills.includes(s)) removeSkill(s)
      })
      newSkills.forEach((s) => {
        if (!prevSkills.includes(s)) addSkill(s)
      })

      // Sync interests
      const newInterests = data.interests || []
      const prevInterests = interests || []
      prevInterests.forEach((i) => {
        if (!newInterests.includes(i)) removeInterest(i)
      })
      newInterests.forEach((i) => {
        if (!prevInterests.includes(i)) addInterest(i)
      })

      // Refresh user data from auth context
      if (user?.refetch) {
        await user.refetch()
      }
    } catch (error) {
      console.error("[StudentDashboard] Failed to update profile:", error)
      alert("Failed to update profile. Please try again.")
    }
  }

  // new logout handler: call logout, navigate to landing, open large auth modal in login mode
  async function handleLogout() {
    try {
      await logout?.()
    } catch (err) {
      console.warn("Logout error (ignored):", err)
    } finally {
      navigate("/")
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
              <h1 className="text-3xl font-bold text-slate-800">Welcome, {user?.name || "Student"}</h1>
              <p className="text-slate-500 mt-1">Manage your profile, projects, and tasks</p>
            </div>

            <div className="flex gap-4">
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="My Tasks" value={`${completedTasks}/${totalTasks}`} icon={<ClipboardList className="w-5 h-5" />} />
                <StatCard label="My Projects" value={myProjects.length} icon={<FolderOpen className="w-5 h-5" />} />
                <StatCard label="Available" value={availableProjects.length} icon={<Users className="w-5 h-5" />} />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-2xl shadow-sm p-2">
            <div className="flex space-x-1">
              {[
                { id: "profile", label: "Profile", icon: MessageCircle /* small icon placeholder */ },
                { id: "projects", label: "Projects", icon: FolderOpen },
                { id: "tasks", label: "Task Board", icon: BarChart3 },
                { id: "chat", label: "Group Chat", icon: MessageCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl transition ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            <ProjectTabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              user={user}
              profile={profile}
              skills={skills}
              interests={interests}
              projects={projects}
              myProjects={myProjects}
              availableProjects={availableProjects}
              filteredProjects={filteredProjects}
              activeProject={activeProject}
              setActiveProject={setActiveProject}
              getMessages={getMessages}
              messagesEndRef={messagesEndRef}
              newMessage={newMessage}
              setNewMessage={setNewMessage}
              handleKeyPress={handleKeyPress}
              handleSendMessage={handleSendMessage}
              openJoinModal={openJoinModal}
              openLeaveModal={openLeaveModal}
              closeJoinModal={closeJoinModal}
              closeLeaveModal={closeLeaveModal}
              showJoinModal={showJoinModal}
              showLeaveModal={showLeaveModal}
              selectedProject={selectedProject}
              handleJoinProject={handleJoinProject}
              handleLeaveProject={handleLeaveProject}
              isLoading={isLoading}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              updateTask={updateTask}
              setProjectProgress={setProjectProgress}
              joinProject={joinProject}
              leaveProject={leaveProject}
              enroll={enroll}
              unenroll={unenroll}
              clearChat={clearChat}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              projectFilter={projectFilter}
              setProjectFilter={setProjectFilter}
              onEditProfile={() => setShowEditModal(true)} // <-- show EditProfileModal when pressed
              // Task view persistence props:
              taskView={taskView}
              setTaskView={setTaskView}
            />
          </div>
        </main>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <EditProfileModal
          profile={profile}
          skills={skills}
          interests={interests}
          onClose={() => setShowEditModal(false)}
          onSave={async (data) => {
            await handleSaveProfile(data)
            setShowEditModal(false)
          }}
        />
      )}
    </div>
  )
}
