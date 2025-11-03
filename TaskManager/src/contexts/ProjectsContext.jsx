// src/contexts/ProjectsContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react"

const ProjectsContext = createContext()

// Use the canonical key used elsewhere in your app
const STORAGE_key = "gp_state_v1_projects_v2"

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

function writeProjectsState(state) {
  try {
    localStorage.setItem(STORAGE_key, JSON.stringify(state))
    // notify same-tab listeners (storage event doesn't fire in same tab)
    try {
      window.dispatchEvent(new CustomEvent("gp:projects-updated", { detail: state }))
    } catch (err) {
      // ignore if CustomEvent fails in some envs
    }
  } catch (e) {
    console.error("Error writing projects state", e)
  }
}

export function ProjectsProvider({ children }) {
  const [projectsState, setProjectsState] = useState(() => readProjectsState())

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

    window.addEventListener("storage", handleStorage)
    window.addEventListener("gp:projects-updated", handleCustom)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("gp:projects-updated", handleCustom)
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
