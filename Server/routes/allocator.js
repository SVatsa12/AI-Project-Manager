// Server/routes/allocator.js
const express = require("express");
const AllocatorService = require("../services/AllocatorService");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const ASSIGNMENTS_FILE = path.join(__dirname, "..", "data", "assignments.json");

function readJson(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return fallback;
  }
}
function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.warn("writeJson error", e.message);
  }
}

// POST /api/allocator/allocate
router.post("/allocate", async (req, res) => {
  try {
    const { projectId = null, projectSkills = [], teamSize = 3, persist = false, reason = "" } = req.body || {};

    if (!projectId && (!Array.isArray(projectSkills) || projectSkills.length === 0)) {
      return res.status(400).json({ ok: false, error: "provide projectId or projectSkills array" });
    }

    const result = AllocatorService.allocate({
      projectId,
      projectSkills,
      teamSize: Number(teamSize) || 3,
      persist: !!persist,
      reason
    });

    return res.json({ ok: true, result });
  } catch (err) {
    console.error("allocator error", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /api/allocator/assignments
router.get("/assignments", (req, res) => {
  try {
    const assignments = readJson(ASSIGNMENTS_FILE, []);
    res.json({ ok: true, assignments });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/allocator/unassign  { assignmentId }
router.post("/unassign", (req, res) => {
  try {
    const { assignmentId } = req.body || {};
    if (!assignmentId) return res.status(400).json({ ok: false, error: "assignmentId required" });

    const assignments = readJson(ASSIGNMENTS_FILE, []);
    const idx = assignments.findIndex(a => a.id === assignmentId);
    if (idx === -1) return res.status(404).json({ ok: false, error: "assignment not found" });

    const removed = assignments.splice(idx, 1)[0];
    writeJson(ASSIGNMENTS_FILE, assignments);
    res.json({ ok: true, removed });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/allocator/debug (info)
router.get("/debug", (req, res) => {
  try {
    const users = require("../data/users.json");
    const projects = require("../data/projects.json");
    const assignments = readJson(ASSIGNMENTS_FILE, []);
    res.json({ ok: true, usersCount: users.length, projectsCount: projects.length, assignmentsCount: assignments.length, users, projects, assignments });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
