// src/pages/Leaderboard.jsx
import React, { useMemo, useState, useEffect } from "react"
import { Trophy, Star } from "lucide-react"
import { useProjectsBackend } from "../contexts/ProjectsBackendContext"
import { useCompetitions } from "../contexts/CompetitionsContext"
import { useAuth } from "../auth/AuthContext"
import { io } from "socket.io-client"

/* ===== Backend detection ===== */
const BACKEND_API = (() => {
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta &&
      import.meta.env &&
      import.meta.env.VITE_BACKEND_URL
    ) {
      return import.meta.env.VITE_BACKEND_URL;
    }
  } catch {}
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL
  ) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  return "http://localhost:4003";
})();

function getStoredToken() {
  return (
    localStorage.getItem("gpa_token") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("gpa_token") ||
    null
  );
}

async function apiFetch(path, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const fetchOpts = {
    method: options.method || "GET",
    headers,
    credentials: options.credentials || "omit",
  };

  const url = `${BACKEND_API}${path}`;
  const res = await fetch(url, fetchOpts);
  return res;
}

/**
 * Leaderboard / Achievements page
 *
 * Defensive: all context data is validated to be arrays/objects before use so
 * the UI won't crash if contexts return unexpected shapes (or are empty).
 *
 * Points algorithm:
 * - +50 points for joining a project
 * - +50 points for completing a project (status === "completed")
 * - +10 points per completed task (status === "done")
 * - +200 points for competition win (you can adjust weights)
 */

function computePointsForStudent({ email, projects = [], competitions = [] }) {
  const normalizedEmail = (email || "").toLowerCase()
  let points = 0

  const safeProjects = Array.isArray(projects) ? projects : []
  const safeCompetitions = Array.isArray(competitions) ? competitions : []

  // Calculate points from projects
  safeProjects.forEach((p) => {
    const members = Array.isArray(p?.members) ? p.members : []
    const isMember = members.map((m) => String(m).toLowerCase()).includes(normalizedEmail)
    
    if (isMember) {
      // +50 points for joining project
      points += 50
      
      // +50 points for completing project (check studentProgress status)
      const studentProgress = p?.studentProgress || {}
      const userProgress = studentProgress[normalizedEmail]
      if (userProgress?.status === "completed") {
        points += 50
      }
    }
    
    // +10 points per completed task
    const tasks = Array.isArray(p?.tasks) ? p.tasks : []
    tasks.forEach((t) => {
      if ((t.assignee || "").toLowerCase() === normalizedEmail && t.status === "done") {
        points += 10
      }
    })
  })

  // competitions: add points for placements
  safeCompetitions.forEach((c) => {
    const results = Array.isArray(c?.results) ? c.results : []
    const res = results.find((r) => (r.email || "").toLowerCase() === normalizedEmail)
    if (res) {
      if (res.rank === 1) points += 200
      else if (res.rank === 2) points += 120
      else if (res.rank === 3) points += 80
      else points += 20
    }
  })

  return points
}

export default function Leaderboard() {
  const { user } = useAuth()

  // call contexts normally (they should exist); defensively coerce shapes below
  const projectsCtx = useProjectsBackend ? useProjectsBackend() : {}
  const competitionsCtx = useCompetitions ? useCompetitions() : {}

  const rawProjects = projectsCtx?.projects ?? []
  const rawCompetitions = competitionsCtx?.competitions ?? []

  // ensure arrays
  const projects = Array.isArray(rawProjects) ? rawProjects : []
  const competitions = Array.isArray(rawCompetitions) ? rawCompetitions : []

  // Fetch students from backend (same as StudentsPage)
  const [remoteStudents, setRemoteStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)

  useEffect(() => {
    let socket = null
    let mounted = true

    async function fetchStudents() {
      if (mounted) setLoadingStudents(true)
      try {
        console.log("[Leaderboard] Fetching students from /api/students...")
        const res = await apiFetch(`/api/students`, { method: "GET" })
        console.log("[Leaderboard] Response status:", res.status)
        
        if (!res.ok) {
          console.warn("[Leaderboard] Non-ok response", res.status)
          const errorText = await res.text().catch(() => "")
          console.warn("[Leaderboard] Error response:", errorText)
          if (mounted) setRemoteStudents([])
          return
        }

        const json = await res.json().catch(() => null)
        console.log("[Leaderboard] Received students data:", json)
        const arr = json?.students || []
        console.log("[Leaderboard] Students array length:", arr.length)

        const normalized = (arr || []).map((u) => ({
          id: u._id || u.id || u.email,
          name: u.name || (u.email ? u.email.split("@")[0] : ""),
          email: u.email,
          skills: Array.isArray(u.skills) ? u.skills : [],
          role: u.role || "student",
        }))
        console.log("[Leaderboard] Normalized students:", normalized)
        if (mounted) setRemoteStudents(normalized)
      } catch (e) {
        console.error("[Leaderboard] fetchStudents error:", e)
        if (mounted) setRemoteStudents([])
      } finally {
        if (mounted) setLoadingStudents(false)
      }
    }

    // Initialize Socket.IO for real-time updates
    async function initSocket() {
      try {
        const token = getStoredToken()
        socket = io(BACKEND_API, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          auth: token ? { token } : undefined,
          reconnectionAttempts: 3,
        })

        socket.on("connect", () => {
          if (!mounted) return
          console.info("[Leaderboard] Socket connected", socket.id)
        })

        socket.on("connect_error", (err) => {
          console.error("[Leaderboard] Socket connect_error", err?.message || err)
        })

        socket.on("students:updated", () => {
          if (!mounted) return
          console.info("[Leaderboard] students:updated event received - refreshing students")
          fetchStudents()
        })

        socket.on("disconnect", (reason) => {
          console.info("[Leaderboard] Socket disconnected", reason)
        })
      } catch (e) {
        console.warn("[Leaderboard] Socket init failed:", e)
      }
    }

    initSocket()
    fetchStudents()

    return () => {
      mounted = false
      if (socket) {
        try {
          socket.disconnect()
        } catch (e) {
          /* ignore */
        }
      }
    }
  }, [])

  // Use only students from backend (no mock data)
  const studentsList = remoteStudents

  // ---- Build leaderboard entries ----
  const leaderboard = useMemo(() => {
    console.log("[Leaderboard] Building leaderboard with:", {
      studentsCount: studentsList.length,
      projectsCount: projects.length,
      competitionsCount: competitions.length
    })
    
    const entries = (studentsList || []).map((stu) => {
      const pts = computePointsForStudent({
        email: stu.email,
        projects,
        competitions,
      })

      // completed tasks and joined projects - defensive access
      const completedTasks = projects.reduce((acc, p) => {
        const tasks = Array.isArray(p?.tasks) ? p.tasks : []
        return (
          acc +
          tasks.filter(
            (t) =>
              (t.assignee || "").toLowerCase() === (stu.email || "").toLowerCase() && t.status === "done"
          ).length
        )
      }, 0)

      const joinedProjects = projects.filter((p) => {
        const members = Array.isArray(p?.members) ? p.members : []
        return members.map((m) => String(m).toLowerCase()).includes((stu.email || "").toLowerCase())
      }).length

      const entry = {
        id: stu.id || stu.email,
        name: stu.name || stu.email,
        email: stu.email,
        points: pts,
        completedTasks,
        joinedProjects,
      }
      
      console.log(`[Leaderboard] Student ${stu.email}:`, entry)
      return entry
    })

    // sort descending by points, then completedTasks
    entries.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      return b.completedTasks - a.completedTasks
    })

    return entries
  }, [studentsList, projects, competitions])

  const top3 = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3, 30)

  const myEntry = leaderboard.find(
    (l) => (l.email || "").toLowerCase() === (user?.email || "").toLowerCase()
  )

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 via-white to-indigo-50 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            Leaderboard
          </h1>
          <p className="text-slate-500 mt-1">
            Track achievements — completed tasks, projects joined and competition wins.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-xl bg-white/60 backdrop-blur-lg border border-indigo-100 shadow-sm">
            <div className="text-sm text-slate-600">
              Your points:{" "}
              <span className="font-semibold text-indigo-700">{myEntry?.points ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {loadingStudents ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading students...</div>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-600 mb-2">No students found</h3>
            <p className="text-slate-500">Students will appear here once they're added to the system.</p>
          </div>
        </div>
      ) : (
        <>
          {/* Top 3 showcase */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {top3.map((p, idx) => (
                <div
                  key={p.id}
                  className={`relative rounded-2xl p-6 text-center backdrop-blur-xl border transition-transform hover:-translate-y-2 hover:shadow-xl 
                    ${
                      idx === 0
                        ? "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200"
                        : idx === 1
                        ? "bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200"
                        : "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
                    }`}
                >
                  <div
                    className={`absolute -top-3 right-4 px-3 py-1 text-xs rounded-full font-semibold shadow-sm 
                    ${idx === 0 ? "bg-yellow-400 text-white" : idx === 1 ? "bg-indigo-400 text-white" : "bg-purple-400 text-white"}`}
                  >
                    #{idx + 1}
                  </div>

                  <div className="flex flex-col items-center justify-center gap-3">
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg 
                      ${idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-indigo-400" : "bg-purple-400"}`}
                    >
                      {idx === 0 ? <Trophy className="w-7 h-7" /> : <Star className="w-6 h-6" />}
                    </div>
                    <div className="text-lg font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      {p.joinedProjects} projects • {p.completedTasks} tasks
                    </div>
                    <div
                      className={`mt-2 text-2xl font-bold ${
                        idx === 0
                          ? "text-yellow-500"
                          : idx === 1
                          ? "text-indigo-600"
                          : "text-purple-600"
                      }`}
                    >
                      {p.points} pts
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Rest of leaderboard */}
          {rest.length > 0 && (
            <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-md border border-slate-100 p-6">
              <div className="grid grid-cols-[40px_1fr_120px_80px] gap-4 items-center font-semibold text-slate-700 text-sm border-b border-slate-200 pb-3 mb-3">
                <div>#</div>
                <div>Student</div>
                <div className="text-right">Projects / Tasks</div>
                <div className="text-right">Points</div>
              </div>

              <div className="space-y-3">
                {rest.map((p, i) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[40px_1fr_120px_80px] gap-4 items-center rounded-xl p-3 transition hover:bg-indigo-50/40"
                  >
                    <div className="text-slate-600 font-medium">{i + 4}</div>
                    <div>
                      <div className="font-medium text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.email}</div>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      {p.joinedProjects} / {p.completedTasks}
                    </div>
                    <div className="text-right font-semibold text-indigo-600">{p.points}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
