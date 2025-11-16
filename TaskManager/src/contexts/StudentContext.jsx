// src/contexts/StudentContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { apiFetch } from "../lib/api"

const StudentContext = createContext()

// Empty initial state - will be populated from backend
function getInitialState() {
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

export function StudentProvider({ children }) {
  const [studentState, setStudentState] = useState(getInitialState)

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
  const refetchProfile = useCallback(async () => {
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
  }, [])

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
