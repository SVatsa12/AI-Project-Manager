// server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // <-- Import the User model

// Try to use bcrypt, fallback to bcryptjs if native bcrypt isn't available
let bcrypt;
try {
  bcrypt = require("bcrypt");
} catch (e) {
  console.warn("Native bcrypt not available, falling back to bcryptjs");
  bcrypt = require("bcryptjs");
}

// --------------------------------------------------------------------
// CONFIG
// --------------------------------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const TOKEN_EXPIRES = "8h";

// --------------------------------------------------------------------
// Helper: emit students update on app io (safe)
// --------------------------------------------------------------------
function emitStudentsUpdated(req) {
  try {
    const io = req.app && req.app.locals ? req.app.locals.io : null;
    if (io) {
      io.emit("students:updated");
    }
  } catch (e) {
    console.warn("emitStudentsUpdated failed:", e);
  }
}

// --------------------------------------------------------------------
// LOGIN
// --------------------------------------------------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    // Find the user in the MongoDB database
    const user = await User.findOne({ email: (email || "").toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare the provided password with the stored hash
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    // Create a user object to return, excluding the password hash
    const publicUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    return res.json({ token, user: publicUser });
  } catch (e) {
    console.error("Login error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------------------------
// SIGNUP
// --------------------------------------------------------------------
router.post("/signup", async (req, res) => {
  const { name, email, password, role = "student" } = req.body || {};
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, and password are required" });
  }

  try {
    // Check if user already exists in the database
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create a new user instance using the Mongoose model
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      passwordHash, // Note: The model field is passwordHash
      role,
    });

    // Save the new user to the database
    await newUser.save();

    // Emit students:updated if a student was created
    try {
      if (role === "student") emitStudentsUpdated(req);
    } catch (e) {
      console.warn("Failed to emit students:updated after signup", e);
    }

    // Generate token
    const token = jwt.sign(
      { sub: newUser._1d, role: newUser.role, email: newUser.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES }
    );

    // Create a user object to return, excluding the password hash
    const publicUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    return res.status(201).json({ token, user: publicUser });
  } catch (e) {
    console.error("Signup error:", e);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// --------------------------------------------------------------------
// ME endpoint (verify token and return user)
// --------------------------------------------------------------------
router.get("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Find the user in the database by their ID from the token
    const user = await User.findById(decoded.sub).select("-passwordHash"); // .select('-passwordHash') excludes the hash

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

// --------------------------------------------------------------------
// UPDATE PROFILE (PUT /me) - updates current user's profile (name, skills, profile, password)
// Emits students:updated if user's role === 'student'
// --------------------------------------------------------------------
router.put("/me", async (req, res) => {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer "))
    return res.status(401).json({ message: "Missing token" });

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub;
    const allowed = ["name", "skills", "profile", "password"];
    const updates = {};

    // pick allowed fields from body
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        updates[k] = req.body[k];
      }
    }

    // handle password separately (hash it)
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    // If skills are provided as comma-separated string, normalize to array
    if (updates.skills && typeof updates.skills === "string") {
      updates.skills = updates.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Save updates
    const updated = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
      select: "-passwordHash",
    });

    if (!updated) return res.status(404).json({ message: "User not found" });

    // Emit students:updated if this user is a student
    try {
      if (updated.role === "student") emitStudentsUpdated(req);
    } catch (e) {
      console.warn("Emit after profile update failed", e);
    }

    return res.json({ user: updated });
  } catch (e) {
    console.error("PUT /me error:", e);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;
