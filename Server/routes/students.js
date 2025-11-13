// server/routes/students.js
const express = require("express");
const router = express.Router();
const Enrollment = require("../models/Enrollment");
const authMiddleware = require("../middleware/auth");

// bcrypt fallback like in auth.js
let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (e) {
    console.warn("Native bcrypt not available in students.js, falling back to bcryptjs");
    bcrypt = require("bcryptjs");
}

// Helper to generate a short random password (dev use only)
function generateRandomPassword() {
  return Math.random().toString(36).slice(-12);
}

/**
 * ✅ GET all students - Authenticated users (both students and admins can view)
 * - Normalizes skills into an array of trimmed strings so frontend receives consistent data
 * - Students can view this for leaderboard functionality
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Allow both students and admins to view student list (needed for leaderboard)
    let students = await Enrollment.find({ role: "student" })
      .select("-passwordHash")
      .sort({ createdAt: -1 })
      .lean();

    // Normalize skills
    students = students.map((s) => {
      try {
        if (Array.isArray(s.skills) && s.skills.length > 0) {
          s.skills = s.skills
            .map((sk) => (typeof sk === "string" ? sk.trim() : ""))
            .filter(Boolean);
        } else {
          s.skills = [];
        }
      } catch (err) {
        console.warn("[students GET] skill normalization failed for", s._id, err);
        s.skills = [];
      }
      return s;
    });

    if (students.length > 0) {
      console.log("[students GET] sample student skills:", students[0]._id, students[0].skills);
    }

    res.json({ ok: true, students });
  } catch (err) {
    console.error("Get students error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ POST create student manually - Admin only
 * - Saves skills from frontend (array or comma-separated string)
 * - Generates password if not provided
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    let { name, email, password, skills } = req.body || {};

    name = typeof name === "string" ? name.trim() : "";
    email = typeof email === "string" ? email.toLowerCase().trim() : "";

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    if (!email.includes("@")) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // Normalize skills input
    let normalizedSkills = [];
    if (Array.isArray(skills)) {
      normalizedSkills = skills.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
    } else if (typeof skills === "string") {
      normalizedSkills = skills.split(",").map((s) => s.trim()).filter(Boolean);
    }

    console.log("[POST /students] received skills:", skills);
    console.log("[POST /students] normalized skills:", normalizedSkills);

    // Check duplicate
    const existing = await Enrollment.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Student with this email already exists" });
    }

    // Generate password if not provided
    const initialPassword =
      typeof password === "string" && password.trim().length > 0
        ? password.trim()
        : generateRandomPassword();

    const passwordHash = await bcrypt.hash(initialPassword, 10);

    const newStudent = new Enrollment({
      name,
      email,
      passwordHash,
      role: "student",
      skills: normalizedSkills,
      mustResetPassword: true,
    });

    await newStudent.save();

    const studentData = {
      _id: newStudent._id,
      name: newStudent.name,
      email: newStudent.email,
      role: newStudent.role,
      joinedAt: newStudent.joinedAt,
      skills: newStudent.skills,
    };

    console.log("[POST /students] created student:", studentData);

    res.status(201).json({ ok: true, student: studentData, initialPassword });
  } catch (err) {
    console.error("Create student error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * ✅ DELETE student - Admin only
 * - Requires a valid MongoDB ObjectId (not email)
 * - Handles invalid id formats gracefully
 */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const idOrEmail = req.params.id;

    // Prevent accidental email-based delete
    if (typeof idOrEmail === "string" && idOrEmail.includes("@")) {
      return res
        .status(400)
        .json({ message: "Provide a valid MongoDB student ID (not email) for deletion" });
    }

    const student = await Enrollment.findByIdAndDelete(idOrEmail);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({ ok: true, message: "Student deleted successfully" });
  } catch (err) {
    console.error("Delete student error:", err);

    // Handle bad ObjectId format
    if (
      err.name === "CastError" ||
      (err.message && err.message.toLowerCase().includes("argument passed in must be"))
    ) {
      return res.status(400).json({ message: "Invalid student ID format" });
    }

    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
