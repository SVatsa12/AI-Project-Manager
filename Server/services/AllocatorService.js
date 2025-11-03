// Server/services/AllocatorService.js
const fs = require("fs")
const path = require("path")

const USERS_FILE = path.join(__dirname, "..", "data", "users.json")
const PROJECTS_FILE = path.join(__dirname, "..", "data", "projects.json")
const ASSIGNMENTS_FILE = path.join(__dirname, "..", "data", "assignments.json")

function readJson(file, fallback = []) {
  try {
    const raw = fs.readFileSync(file, "utf8")
    return JSON.parse(raw)
  } catch (e) {
    return fallback
  }
}
function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8")
  } catch (e) {
    console.warn("writeJson error", e.message)
  }
}

// normalize skill strings to simple lowercase tokens
function normalizeSkills(arr = []) {
  return Array.from(new Set((arr || []).map((s) => (s || "").toString().toLowerCase().trim()).filter(Boolean)))
}

// experience ranking for tiebreaking (higher is better)
const EXPERIENCE_WEIGHT = { senior: 3, mid: 2, junior: 1, unknown: 1 }

function scoreUserForProject(user, requiredSkills) {
  const userSkills = normalizeSkills(user.skills)
  const req = normalizeSkills(requiredSkills)

  // matched required skills set & matched count
  const matchedRequired = req.filter((s) => userSkills.includes(s))
  const matchedCount = matchedRequired.length

  // coverage: fraction of required skills this user covers
  const coverage = req.length === 0 ? 0 : matchedCount / req.length

  // extra skills (bonus) - how many additional skills user has that are not required
  const extraSkillsCount = userSkills.filter((s) => !req.includes(s)).length

  // experience numeric
  const expScore = EXPERIENCE_WEIGHT[(user.experienceLevel || "").toLowerCase()] || EXPERIENCE_WEIGHT.unknown

  // availability boolean -> prioritized
  const availableBonus = user.available === false ? -0.5 : 0

  // final composite score (for ranking only; not persisted)
  // coverage is primary — heavily weighted. Then match count, experience, extras, availability
  const composite =
    coverage * 100 + // primary
    matchedCount * 2 + // tie-breaker by raw matches
    expScore * 1.2 + // prefer more experienced
    extraSkillsCount * 0.1 + // small bonus
    availableBonus

  return {
    userId: user.id,
    name: user.name,
    matchedRequired,
    matchedCount,
    coverage,
    extraSkillsCount,
    experienceLevel: user.experienceLevel || "unknown",
    available: !!user.available,
    compositeScore: Number(composite.toFixed(4)),
  }
}

const AllocatorService = {
  // load data helpers
  loadUsers() {
    return readJson(USERS_FILE, [])
  },
  loadProjects() {
    return readJson(PROJECTS_FILE, [])
  },
  loadAssignments() {
    return readJson(ASSIGNMENTS_FILE, [])
  },

  // main allocation method
  /**
   * allocate({ projectId, projectSkills, teamSize = 3, persist = false })
   * - projectId: optional; if provided, loads project from projects.json and uses its skills
   * - projectSkills: array of skill tags (ignored if projectId used)
   * - teamSize: how many users to return/assign
   * - persist: if true, write assignments to assignments.json
   */
  allocate: function ({ projectId = null, projectSkills = [], teamSize = 3, persist = false, reason = "" } = {}) {
    const users = this.loadUsers()
    let reqSkills = normalizeSkills(projectSkills || [])

    if (projectId) {
      const projects = this.loadProjects()
      const proj = projects.find((p) => String(p.id) === String(projectId))
      if (!proj) throw new Error("project not found: " + projectId)
      // assume project has `skills` array
      reqSkills = normalizeSkills(proj.skills || [])
    }

    // compute scores for each user
    const scored = users.map((u) => scoreUserForProject(u, reqSkills))

    // filter out users with zero matching coverage (optional: keep if you want)
    // we keep those with coverage > 0 or available true (configurable)
    const filtered = scored.filter((s) => s.coverage > 0 || s.available)

    // sort: primary compositeScore desc, then coverage desc, matchedCount desc, experience desc
    filtered.sort((a, b) => {
      if (b.compositeScore !== a.compositeScore) return b.compositeScore - a.compositeScore
      if (b.coverage !== a.coverage) return b.coverage - a.coverage
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount
      const aExp = EXPERIENCE_WEIGHT[(a.experienceLevel || "").toLowerCase()] || 1
      const bExp = EXPERIENCE_WEIGHT[(b.experienceLevel || "").toLowerCase()] || 1
      if (bExp !== aExp) return bExp - aExp
      // finally alphabetical
      if (a.name && b.name) return a.name.localeCompare(b.name)
      return 0
    })

    // take top teamSize
    const chosen = filtered.slice(0, teamSize)

    if (persist) {
      const assignments = this.loadAssignments()
      const now = new Date().toISOString()
      chosen.forEach((c) => {
        assignments.push({
          id: `asgn_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
          projectId: projectId || null,
          userId: c.userId,
          assignedAt: now,
          coverage: c.coverage,
          matchedRequired: c.matchedRequired,
          reason,
        })
      })
      writeJson(ASSIGNMENTS_FILE, assignments)
    }

    return {
      projectId,
      requiredSkills: reqSkills,
      teamSize,
      candidates: chosen,
      timestamp: new Date().toISOString(),
    }
  },
}

module.exports = AllocatorService
