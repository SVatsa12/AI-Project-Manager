// src/contexts/ThemeContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react"

const ThemeCtx = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light")

  useEffect(() => {
    // apply class to body (or document.documentElement)
    document.body.classList.remove("theme-light", "theme-dark")
    document.body.classList.add(`theme-${theme}`)
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggle = (value) => {
    if (value) setTheme(value)
    else setTheme((t) => (t === "light" ? "dark" : "light"))
  }

  return <ThemeCtx.Provider value={{ theme, setTheme: toggle }}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}
