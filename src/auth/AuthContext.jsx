import React, { createContext, useContext, useState, useEffect } from "react"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  // persist login across refresh
  useEffect(() => {
    const saved = localStorage.getItem("user")
    if (saved) setUser(JSON.parse(saved))
  }, [])

  // --- login/logout functions ---
  function login(userObj) {
    setUser(userObj)
    localStorage.setItem("user", JSON.stringify(userObj))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem("user")
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// custom hook for easy usage
export function useAuth() {
  return useContext(AuthContext)
}
