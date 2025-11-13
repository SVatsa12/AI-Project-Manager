import React, { useEffect, useMemo, useState } from "react"
import {
  Search,
  ExternalLink,
  Calendar,
  Bookmark as BookmarkIcon,
  Download,
  Users,
  DollarSign,
  Clock,
  MapPin,
  ArrowRightCircle,
} from "lucide-react"
import { motion } from "framer-motion"

/* ---------- Utilities ---------- */
function formatDate(iso) {
  if (!iso) return "TBA"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  } catch {
    return "TBA"
  }
}
function timeUntilLabel(iso) {
  if (!iso) return "TBA"
  const d = new Date(iso)
  const now = new Date()
  const diff = d - now
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (diff < 0) return "Started"
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days <= 7) return `${days}d`
  return formatDate(iso)
}
function downloadICS(item) {
  const dtStart = item.startDate ? new Date(item.startDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z" : ""
  const dtEnd = item.endDate ? new Date(item.endDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z" : ""
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AiTaskAllocator//Competitions//EN",
    "BEGIN:VEVENT",
    `UID:${item.id}`,
    `SUMMARY:${(item.title || "").replace(/(\r\n|\n|\r)/gm, " ")}`,
    item.startDate ? `DTSTART:${dtStart}` : "",
    item.endDate ? `DTEND:${dtEnd}` : "",
    `DESCRIPTION:${(item.description || "").replace(/(\r\n|\n|\r)/gm, " ")}`,
    `URL:${item.url || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n")
  const blob = new Blob([icsLines], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${(item.title || "event").replace(/\s+/g, "-")}.ics`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function csvFromItems(items) {
  const header = ["title", "url", "startDate", "endDate", "source", "description"]
  const rows = items.map((it) => [
    `"${(it.title || "").replace(/"/g, '""')}"`,
    `"${(it.url || "").replace(/"/g, '""')}"`,
    it.startDate || "",
    it.endDate || "",
    `"${(it.source || "").replace(/"/g, '""')}"`,
    `"${(it.description || "").replace(/"/g, '""')}"`,
  ].join(","))
  return [header.join(","), ...rows].join("\n")
}
function saveCSV(items) {
  const csv = csvFromItems(items)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `competitions_export_${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/* palette used for rotating accents */
const ACCENTS = ["emerald", "indigo", "rose", "amber", "slate"]

/* ---------- Visual Card (Devpost-like) with glossy wrapper ---------- */
function CompetitionCard({ item, onToggleBookmark, bookmarked, accent = "indigo" }) {
  const thumb = item.image || item.logo || null
  const gradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)"
  ]
  const gradientIndex = (item.title || "").charCodeAt(0) % gradients.length
  
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.12)" }}
      transition={{ duration: 0.2 }}
      className="glossy w-full overflow-hidden flex bg-white"
      data-accent={accent}
      style={{ alignItems: "stretch" }}
    >
      <div className="gloss-inner w-full flex">
        {/* thumbnail */}
        <div className="flex-shrink-0 w-44 p-4 flex items-center justify-center" style={{ background: thumb ? "#f8fafc" : gradients[gradientIndex] }}>
          {thumb ? (
            <img 
              src={thumb} 
              alt={item.title} 
              className="w-full h-32 object-contain rounded-lg"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.parentElement.innerHTML = `<div class="w-full h-32 rounded-lg flex items-center justify-center text-4xl font-bold text-white" style="background: ${gradients[gradientIndex]}">${(item.title || "H").slice(0,1).toUpperCase()}</div>`
              }}
            />
          ) : (
            <div className="w-full h-32 rounded-lg flex items-center justify-center text-4xl font-bold text-white">
              {(item.title || "H").slice(0,1).toUpperCase()}
            </div>
          )}
        </div>

        {/* main content */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <a href={item.url || "#"} target="_blank" rel="noreferrer" className="text-lg font-semibold text-slate-900 hover:text-emerald-600">
                {item.title}
              </a>

              <p className="text-sm text-slate-600 mt-2 line-clamp-2">{item.description || "No description available."}</p>

              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{item.startDate ? timeUntilLabel(item.startDate) : "TBA"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{item.location || (item.online ? "Online" : "—")}</span>
                </div>

                <div className="px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">{item.source}</div>
              </div>

              <div className="mt-4 flex items-center gap-6 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">{item.prize ? item.prize : item.prizeText ? item.prizeText : "$—"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500">{item.participants || item.attendees || "—"} participants</span>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {(item.tags || []).slice(0,3).map(t => (
                    <div key={t} className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">{t}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* action column */}
            <div className="w-36 flex flex-col items-end justify-between p-3">
              <div className="flex flex-col gap-2 w-full">
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded text-sm text-emerald-700 hover:bg-emerald-50">
                  <ExternalLink className="w-4 h-4" /> Open
                </a>

                <button onClick={() => onToggleBookmark(item)} className={`inline-flex items-center justify-center gap-2 px-3 py-2 border rounded text-sm ${bookmarked ? 'bg-emerald-600 text-white' : 'text-slate-700'}`}>
                  <BookmarkIcon className="w-4 h-4" /> {bookmarked ? "Saved" : "Save"}
                </button>

                <button onClick={() => downloadICS(item)} className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded text-sm text-slate-700 hover:bg-slate-50">
                  <Calendar className="w-4 h-4" /> Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="gloss-shine" aria-hidden="true" />
    </motion.article>
  )
}

/* ---------- Main Competitions Page ---------- */
export default function CompetitionsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [q, setQ] = useState("")
  const [onlyUpcoming, setOnlyUpcoming] = useState(true)
  const [view, setView] = useState("list")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [bookmarks, setBookmarks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("competitions_bookmarks") || "[]") } catch { return [] }
  })
  const [sources, setSources] = useState([])

  useEffect(() => {
    localStorage.setItem("competitions_bookmarks", JSON.stringify(bookmarks))
  }, [bookmarks])

  // backend base (Vite env recommended)
  const BACKEND_API = import.meta.env.VITE_BACKEND_URL || "http://localhost:4003"

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Fetch from main competitions endpoint that aggregates external sources
        const res = await fetch(`${BACKEND_API}/api/competitions`)
        if (!res.ok) {
          const text = await res.text().catch(() => "")
          throw new Error(`Failed to fetch competitions: ${res.status} ${text.slice(0,200)}`)
        }
        const json = await res.json()
        
        // Server returns {source: "cache|live", count: N, items: [...]}
        const competitions = json.items || json || [];
        if (mounted) setItems(competitions)

      } catch (e) {
        if (mounted) setError(e.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    async function loadSources() {
      try {
        const s = await fetch(`${BACKEND_API}/api/competitions/sources`)
        if (!s.ok) return
        const js = await s.json()
        if (mounted) setSources(js)
      } catch (e) {
   
      }
    }
    load()
    loadSources()
    const id = setInterval(load, 1000 * 60 * 2)
    return () => { mounted = false; clearInterval(id) }
  }, [BACKEND_API])

  const uniqueSources = useMemo(() => {
    const set = new Set(items.map(i => i.source).filter(Boolean))
    return Array.from(set)
  }, [items])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return items.filter(it => {
      if (onlyUpcoming && it.startDate && new Date(it.startDate) < new Date()) return false
      if (sourceFilter !== "all" && it.source !== sourceFilter) return false
      if (!query) return true
      return (it.title + " " + (it.description || "") + " " + (it.tags || []).join(" ")).toLowerCase().includes(query)
    })
  }, [items, q, onlyUpcoming, sourceFilter])

  function toggleBookmark(item) {
    setBookmarks(prev => {
      if (prev.some(p => p.id === item.id)) return prev.filter(p => p.id !== item.id)
      return [item, ...prev].slice(0, 200)
    })
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Competitions & Hackathons</h1>
            <p className="text-sm text-slate-500 mt-1">Modern list view inspired by Devpost — thumbnails, quick stats and actions.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, tags or description" className="ml-2 outline-none placeholder:text-slate-400" />
            </div>

            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2">
              <label className="text-sm text-slate-600 mr-1">Upcoming</label>
              <input type="checkbox" checked={onlyUpcoming} onChange={(e) => setOnlyUpcoming(e.target.checked)} />
            </div>

            <div className="bg-white border rounded-lg px-2 py-2 flex items-center gap-2">
              <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="outline-none text-sm">
                <option value="all">All sources</option>
                {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="bg-white border rounded-lg px-2 py-2 flex items-center gap-2">
              <button onClick={() => setView("list")} className={`px-3 py-1 rounded ${view === "list" ? "bg-emerald-50 text-emerald-700" : ""}`}>List</button>
              <button onClick={() => setView("grid")} className={`px-3 py-1 rounded ${view === "grid" ? "bg-emerald-50 text-emerald-700" : ""}`}>Grid</button>
            </div>

            <div>
              <button onClick={() => saveCSV(filtered)} className="bg-white border px-3 py-2 rounded flex items-center gap-2 text-sm">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>
        </header>

        {loading && <div className="space-y-4"><div className="h-36 bg-slate-100 rounded animate-pulse" /><div className="h-36 bg-slate-100 rounded animate-pulse" /></div>}
        {error && <div className="p-4 bg-red-50 border rounded text-red-700">{error}</div>}
        {!loading && filtered.length === 0 && <div className="p-8 bg-white border rounded text-slate-500">No competitions found — try removing filters or add more sources on the.</div>}

        {/* list view */}
        {view === "list" && (
          <div className="space-y-4">
            {filtered.map((item, idx) => {
              const accent = ACCENTS[idx % ACCENTS.length]
              return <CompetitionCard key={item.id} item={item} onToggleBookmark={toggleBookmark} bookmarked={bookmarks.some(b => b.id === item.id)} accent={accent} />
            })}
          </div>
        )}

        {/* optional grid view (thumbnail tiles) */}
        {view === "grid" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item, idx) => {
              const accent = ACCENTS[idx % ACCENTS.length]
              const gradients = [
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
                "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                "linear-gradient(135deg, #30cfd0 0%, #330867 100%)"
              ]
              const gradientIndex = (item.title || "").charCodeAt(0) % gradients.length
              
              return (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -8, boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}
                  transition={{ duration: 0.2 }}
                  className="glossy overflow-hidden shadow-sm bg-white" 
                  data-accent={accent}
                >
                  <div className="gloss-inner">
                    <div className="h-48 flex items-center justify-center p-6" style={{ background: item.image ? "#f1f5f9" : gradients[gradientIndex] }}>
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-contain rounded-lg" 
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-6xl font-bold text-white">${(item.title || "H").slice(0,1).toUpperCase()}</div>`
                            e.target.parentElement.style.background = gradients[gradientIndex]
                          }}
                        />
                      ) : (
                        <div className="text-6xl font-bold text-white">
                          {(item.title || "H").slice(0,1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-lg text-slate-800 hover:text-emerald-600 block line-clamp-2 mb-2">
                        {item.title}
                      </a>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-3">{item.description || "No description available."}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(item.startDate)}</span>
                        </div>
                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded">{item.source}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleBookmark(item)} className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${bookmarks.some(b => b.id === item.id) ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                          {bookmarks.some(b => b.id === item.id) ? '★ Saved' : 'Save'}
                        </button>
                        <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 px-3 py-2 rounded text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 text-center">
                          View
                        </a>
                      </div>
                    </div>
                  </div>
                  <div className="gloss-shine" aria-hidden="true" />
                </motion.div>
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}