// server/routes/auth.js
const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user"); // <-- Import the User model

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
// The USERS_PATH, readUsers, and writeUsers functions are no longer needed and have been removed.
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const TOKEN_EXPIRES = "8h";

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
    const token = jwt.sign({ sub: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    
    // Create a user object to return, excluding the password hash
    const publicUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
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
    return res.status(400).json({ message: "Name, email, and password are required" });
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

    // Generate token
    const token = jwt.sign({ sub: newUser._id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });
    
    // Create a user object to return, excluding the password hash
    const publicUser = {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
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
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ message: "Missing token" });

  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find the user in the database by their ID from the token
    const user = await User.findById(decoded.sub).select('-passwordHash'); // .select('-passwordHash') excludes the hash
    
    if (!user) return res.status(404).json({ message: "User not found" });
    
    return res.json({ user });
  } catch (e) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;