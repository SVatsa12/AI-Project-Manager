// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "student"], default: "student" },

    // ✅ New fields
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },

    mustResetPassword: { type: Boolean, default: false },
    profile: { type: Object, default: {} },
    joinedAt: { type: Date, default: Date.now },
  },
  {
    collection: "enrollments",
  }
);

module.exports = mongoose.model("Enrollment", userSchema);
