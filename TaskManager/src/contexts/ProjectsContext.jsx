// src/contexts/ProjectsContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react"
import { io } from "socket.io-client"

const ProjectsContext = createContext()

// Use the canonical key used elsewhere in your app
const STORAGE_key = "gp_state_v1_projects_v2"

// Socket.IO connection
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4003"
let socket = null

function getSocket() {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    })
    
    socket.on("connect", () => {
      console.log("✅ Socket.IO connected:", socket.id)
    })
    
    socket.on("disconnect", () => {
      console.log("❌ Socket.IO disconnected")
    })
  }
  return socket
}

function readProjectsState() {
  try {
    const raw = localStorage.getItem(STORAGE_key)
    if (!raw) return { projects: [], meta: {} }
    const state = JSON.parse(raw)
    state.projects = Array.isArray(state.projects)
      ? state.projects.map((p) => ({ ...p, studentProgress: p.studentProgress || {} }))
      : []
    return { ...state, projects: state.projects }
  } catch (e) {
    console.error("Error reading projects state", e)
    return { projects: [], meta: {} }
  }
}

function writeProjectsState(state, emitSocket = true) {
  try {
    localStorage.setItem(STORAGE_key, JSON.stringify(state))
    // notify same-tab listeners (storage event doesn't fire in same tab)
    try {
      window.dispatchEvent(new CustomEvent("gp:projects-updated", { detail: state }))
    } catch (err) {
      // ignore if CustomEvent fails in some envs
    }
    // Broadcast to all connected clients via Socket.IO (only if local change)
    if (emitSocket) {
      try {
        const socket = getSocket()
        if (socket && socket.connected) {
          console.log("📤 Emitting Socket.IO update")
          socket.emit("projects:update", state)
        } else {
          console.warn("⚠️ Socket not connected, cannot emit update")
        }
      } catch (err) {
        console.warn("Socket.IO emit failed:", err)
      }
    }
  } catch (e) {
    console.error("Error writing projects state", e)
  }
}

export function ProjectsProvider({ children }) {
  const [projectsState, setProjectsState] = useState(() => readProjectsState())

  // Initialize Socket.IO connection on mount
  useEffect(() => {
    const socket = getSocket()
    console.log("🔌 Initializing Socket.IO connection to:", BACKEND_URL)
    return () => {
      // Cleanup on unmount
      if (socket) {
        socket.disconnect()
      }
    }
  }, [])

  // Save to localStorage whenever state changes (single source)
  useEffect(() => {
    writeProjectsState(projectsState)
  }, [projectsState])

  // Listen for storage changes from other tabs (and canonical key)
  useEffect(() => {
    function handleStorage(e) {
      if (e.key !== STORAGE_key) return
      try {
        const parsed = JSON.parse(e.newValue || '{"projects": [], "meta": {}}')
        // normalize
        parsed.projects = Array.isArray(parsed.projects)
          ? parsed.projects.map((p) => ({ ...p, studentProgress: p.studentProgress || {} }))
          : []
        setProjectsState(parsed)
      } catch (err) {
        console.error("Error parsing projects state from storage", err)
      }
    }

    // custom event for same-tab updates
    function handleCustom(e) {
      if (!e?.detail) return
      const parsed = e.detail
      parsed.projects = Array.isArray(parsed.projects)
        ? parsed.projects.map((p) => ({ ...p, studentProgress: p.studentProgress || {} }))
        : []
      setProjectsState(parsed)
    }

    // Socket.IO listener for real-time updates from other users
    const socket = getSocket()
    function handleSocketUpdate(data) {
      console.log("📡 Received Socket.IO update:", data)
      if (!data) return
      const parsed = data
      parsed.projects = Array.isArray(parsed.projects)
        ? parsed.projects.map((p) => ({ ...p, studentProgress: p.studentProgress || {} }))
        : []
      // Update localStorage without triggering another socket emit
      try {
        localStorage.setItem(STORAGE_key, JSON.stringify(parsed))
        window.dispatchEvent(new CustomEvent("gp:projects-updated", { detail: parsed }))
      } catch (err) {
        console.error("Error updating from socket:", err)
      }
      setProjectsState(parsed)
      console.log("✅ State updated from Socket.IO")
    }

    socket.on("projects:update", handleSocketUpdate)

    window.addEventListener("storage", handleStorage)
    window.addEventListener("gp:projects-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("gp:projects-updated", handleCustom)
      socket.off("projects:update", handleSocketUpdate)
    }
  }, [])

  const createProject = (projectData) => {
    const newProject = {
      id: `p${Date.now()}`,
      title: projectData.title,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      techStack: projectData.techStack,
      maxMembers: projectData.maxMembers,
      description: projectData.description,
      members: [],
      tasks: [],
      studentProgress: {},
      createdAt: new Date().toISOString(),
      status: projectData.status || "active",
    }

    setProjectsState((prev) => ({
      ...prev,
      projects: [newProject, ...(prev.projects || [])],
    }))

    return newProject
  }

  const updateProject = (projectId, updates) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
    }))
  }

  const deleteProject = (projectId) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((p) => p.id !== projectId),
    }))
  }

  const addTask = (projectId, taskData) => {
    const newTask = {
      id: `t${Date.now()}`,
      title: taskData.title,
      assignee: taskData.assignee || "",
      status: taskData.status || "todo",
      createdAt: new Date().toISOString(),
    }

    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === projectId ? { ...p, tasks: [...(p.tasks || []), newTask] } : p
      ),
    }))

    return newTask
  }

  const updateTask = (projectId, taskId, updates) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) =>
        p.id === projectId
          ? { ...p, tasks: (p.tasks || []).map((t) => (t.id === taskId ? { ...t, ...updates } : t)) }
          : p
      ),
    }))
  }

  const joinProject = (projectId, userEmail) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) => {
        if (p.id !== projectId) return p
        const members = p.members || []
        if (members.includes(userEmail)) return p
        if (members.length >= (p.maxMembers || Infinity)) {
          throw new Error("Project is full")
        }
        return { ...p, members: [...members, userEmail] }
      }),
    }))
  }

  const leaveProject = (projectId, userEmail) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) => (p.id === projectId ? { ...p, members: (p.members || []).filter((m) => m !== userEmail) } : p)),
    }))
  }

  const setProjectProgress = (projectId, userEmail, status) => {
    setProjectsState((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((project) => {
        if (project.id !== projectId) return project
        return {
          ...project,
          studentProgress: {
            ...(project.studentProgress || {}),
            [userEmail]: { status },
          },
        }
      }),
    }))
  }

  const value = {
    projects: projectsState.projects || [],
    createProject,
    updateProject,
    deleteProject,
    addTask,
    updateTask,
    joinProject,
    leaveProject,
    setProjectProgress,
  }

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects() {
  const context = useContext(ProjectsContext)
  if (!context) throw new Error("useProjects must be used within a ProjectsProvider")
  return context
}
