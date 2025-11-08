// Server/routes/students.js
const express = require("express")
const router = express.Router()
const User = require("../models/User")

function emitStudentsUpdated(req) {
  try {
    const io = req.app?.locals?.io
    if (io) io.emit("students:updated")
  } catch (err) {
    console.warn("emitStudentsUpdated failed", err)
  }
}

// GET all students
router.get("/students", async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).sort({ createdAt: -1 }).lean()
    res.json(students)
  } catch (e) {
    console.error("GET /students error", e)
    res.status(500).json({ ok: false, error: "server error" })
  }
})

// POST add student (admin)
router.post("/students", async (req, res) => {
  try {
    const { name, email, skills = [], role = "student" } = req.body
    const u = new User({ name, email, skills, role })
    await u.save()
    emitStudentsUpdated(req)
    res.status(201).json(u)
  } catch (e) {
    console.error("POST /students error", e)
    res.status(400).json({ ok: false, error: e.message })
  }
})

// DELETE student
router.delete("/students/:id", async (req, res) => {
  try {
    const id = req.params.id
    await User.findByIdAndDelete(id)
    emitStudentsUpdated(req)
    res.json({ ok: true })
  } catch (e) {
    console.error("DELETE /students error", e)
    res.status(500).json({ ok: false })
  }
})

module.exports = router
