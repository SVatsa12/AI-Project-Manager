// Server/routes/students.js
const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/User"); // adjust path/casing if needed

// helper to emit students updated safely
function emitStudentsUpdated(req, payload = {}) {
  try {
    const io =
      (req && req.app && req.app.locals && req.app.locals.io) ||
      (req && req.app && req.app.get && req.app.get("io"));
    if (io) {
      io.emit("students:updated", payload);
    }
  } catch (e) {
    console.warn("emitStudentsUpdated failed:", e);
  }
}

// utility to remove sensitive fields before returning user objects
function safeUser(u) {
  if (!u) return u;
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.passwordHash;
  return obj;
}

// GET /api/students
router.get("/", async (req, res) => {
  console.info("[students] GET / - fetching students");
  try {
    const students = await User.find({ role: "student" }).sort({ createdAt: -1 }).lean();
    // strip sensitive fields
    const safe = students.map((s) => {
      const copy = { ...s };
      delete copy.passwordHash;
      return copy;
    });
    return res.json(safe);
  } catch (err) {
    console.error("[students] GET error:", err);
    return res.status(500).json({ ok: false, error: "server error" });
  }
});

// POST /api/students  (admin creates student)
router.post("/", async (req, res) => {
  console.info("[students] POST / payload:", req.body);
  try {
    const { name, email, skills = [], role = "student" } = req.body || {};
    if (!email || !name) return res.status(400).json({ ok: false, error: "name and email required" });

    const emailNorm = String(email).toLowerCase().trim();

    // check duplicate
    const existing = await User.findOne({ email: emailNorm });
    if (existing) return res.status(409).json({ ok: false, error: "user exists" });

    // generate a temporary password and hash it
    const tempPassword = crypto.randomBytes(6).toString("hex"); // 12 hex chars
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const u = new User({
      name: String(name).trim(),
      email: emailNorm,
      skills: Array.isArray(skills)
        ? skills
        : typeof skills === "string"
        ? skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      role,
      passwordHash,
      createdAt: new Date(),
    });

    const saved = await u.save();

    // emit to socket listeners
    emitStudentsUpdated(req, { action: "created", id: saved._id, email: saved.email });
    console.info(`[students] created ${saved.email} id=${saved._id} tempPassword=${tempPassword}`);

    // return safe user (no passwordHash)
    return res.status(201).json({ ok: true, user: safeUser(saved) });
  } catch (err) {
    console.error("[students] POST error:", err);
    return res.status(500).json({ ok: false, error: err.message || "server error" });
  }
});

// DELETE /api/students/:id
router.delete("/:id", async (req, res) => {
  console.info("[students] DELETE", req.params.id);
  try {
    const id = req.params.id;
    // allow deleting by id; if client passed email as id, attempt to handle it
    let doc;
    if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
      doc = await User.findByIdAndDelete(id);
    } else {
      doc = await User.findOneAndDelete({ email: String(id).toLowerCase().trim() });
    }
    emitStudentsUpdated(req, { action: "deleted", id });
    return res.json({ ok: true, deleted: !!doc });
  } catch (err) {
    console.error("[students] DELETE error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// POST /api/students/importcsv
// Accepts { rows: [{ email, name, skills }] }
router.post("/importcsv", async (req, res) => {
  console.info("[students] POST /importcsv rows:", Array.isArray(req.body.rows) ? req.body.rows.length : typeof req.body.rows);
  try {
    const rows = req.body.rows;
    if (!Array.isArray(rows)) return res.status(400).json({ ok: false, error: "rows must be an array" });

    let created = 0;
    const createdList = [];

    for (const r of rows) {
      const email = (r.email || "").toString().toLowerCase().trim();
      if (!email) continue;
      const exists = await User.findOne({ email });
      if (exists) continue;

      // generate temp password + hash for each created user
      const tempPassword = crypto.randomBytes(6).toString("hex");
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const u = new User({
        name: r.name || email.split("@")[0],
        email,
        skills: Array.isArray(r.skills)
          ? r.skills
          : typeof r.skills === "string"
          ? r.skills.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        role: "student",
        passwordHash,
        createdAt: new Date(),
      });

      const saved = await u.save();
      created++;
      createdList.push({ id: saved._id, email: saved.email });
      console.info(`[students][importcsv] created ${saved.email} tempPassword=${tempPassword}`);
    }

    emitStudentsUpdated(req, { action: "import", created });
    return res.json({ ok: true, created, createdList });
  } catch (err) {
    console.error("[students] importcsv error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
