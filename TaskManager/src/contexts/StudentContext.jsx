// src/contexts/StudentContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react"
import { apiFetch } from "../lib/api"

const StudentContext = createContext()

const STUDENT_STORAGE_KEY = "student_profile_v1"

function readStudentState() {
  try {
    const raw = localStorage.getItem(STUDENT_STORAGE_KEY)
    if (!raw)
      return {
        profile: {
          name: "",
          email: "",
          year: "",
          department: "",
          college: "",
          profilePicture: null,
        },
        skills: [],
        interests: [],
      }
    return JSON.parse(raw)
  } catch (e) {
    console.error("Error reading student state", e)
    return {
      profile: {
        name: "",
        email: "",
        year: "",
        department: "",
        college: "",
        profilePicture: null,
      },
      skills: [],
      interests: [],
    }
  }
}

function writeStudentState(state) {
  try {
    localStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.warn("Failed to write student state to localStorage", e)
  }
}

export function StudentProvider({ children }) {
  const [studentState, setStudentState] = useState(() => readStudentState())

  // Persist to localStorage whenever state changes
  useEffect(() => {
    writeStudentState(studentState)
  }, [studentState])

  // Listen for storage changes from other tabs/windows and sync
  useEffect(() => {
    function handleStorage(e) {
      if (e.key !== STUDENT_STORAGE_KEY) return
      try {
        const parsed = JSON.parse(e.newValue || '{"profile":{},"skills":[],"interests":[]}')
        setStudentState(parsed)
      } catch (err) {
        console.error("Error parsing student state from storage", err)
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [])

  // --- Profile operations ---
  const updateProfile = (profileData) => {
    setStudentState((prev) => {
      const merged = {
        ...prev,
        profile: { ...prev.profile, ...profileData },
      }
      return merged
    })
  }

  const setProfilePicture = (dataUrl) => {
    setStudentState((prev) => ({
      ...prev,
      profile: { ...prev.profile, profilePicture: dataUrl },
    }))
  }

  const clearProfilePicture = () => {
    setStudentState((prev) => ({
      ...prev,
      profile: { ...prev.profile, profilePicture: null },
    }))
  }

  // --- Skills operations ---
  const updateSkills = (skills) => {
    const normalized = Array.isArray(skills) ? skills.map((s) => s.trim()).filter(Boolean) : []
    setStudentState((prev) => ({ ...prev, skills: normalized }))
  }

  const addSkill = (skill) => {
    if (!skill || !skill.trim()) return
    const trimmed = skill.trim()
    setStudentState((prev) => {
      if ((prev.skills || []).includes(trimmed)) return prev
      return { ...prev, skills: [...(prev.skills || []), trimmed] }
    })
  }

  const removeSkill = (skill) => {
    if (!skill) return
    setStudentState((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skill),
    }))
  }

  // --- Interests operations ---
  const updateInterests = (interests) => {
    const normalized = Array.isArray(interests) ? interests.map((i) => i.trim()).filter(Boolean) : []
    setStudentState((prev) => ({ ...prev, interests: normalized }))
  }

  const addInterest = (interest) => {
    if (!interest || !interest.trim()) return
    const trimmed = interest.trim()
    setStudentState((prev) => {
      if ((prev.interests || []).includes(trimmed)) return prev
      return { ...prev, interests: [...(prev.interests || []), trimmed] }
    })
  }

  const removeInterest = (interest) => {
    if (!interest) return
    setStudentState((prev) => ({
      ...prev,
      interests: (prev.interests || []).filter((i) => i !== interest),
    }))
  }

  // --- Utility helpers ---
  const resetStudentState = () => {
    const empty = {
      profile: {
        name: "",
        email: "",
        year: "",
        department: "",
        college: "",
        profilePicture: null,
      },
      skills: [],
      interests: [],
    }
    setStudentState(empty)
  }

  // --- Fetch profile from backend ---
  const refetchProfile = async () => {
    try {
      const data = await apiFetch("/api/auth/me", { method: "GET" })
      
      if (data && data.user) {
        const user = data.user
        setStudentState({
          profile: {
            name: user.name || "",
            email: user.email || "",
            year: user.profile?.year || "",
            department: user.profile?.department || "",
            college: user.profile?.college || "",
            profilePicture: user.profile?.profilePicture || null,
          },
          skills: Array.isArray(user.skills) ? user.skills : [],
          interests: Array.isArray(user.interests) ? user.interests : [],
        })
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error)
    }
  }

  const value = {
    profile: studentState.profile,
    skills: studentState.skills,
    interests: studentState.interests,
    // profile operations
    updateProfile,
    setProfilePicture,
    clearProfilePicture,
    // skills
    updateSkills,
    addSkill,
    removeSkill,
    // interests
    updateInterests,
    addInterest,
    removeInterest,
    // utilities
    resetStudentState,
    refetchProfile,
    // raw setter (use sparingly)
    _rawState: studentState,
    _setRawState: setStudentState,
  }

  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
}

export function useStudent() {
  const context = useContext(StudentContext)
  if (!context) {
    throw new Error("useStudent must be used within a StudentProvider")
  }
  return context
}
