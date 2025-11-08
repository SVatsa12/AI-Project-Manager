// Server/models/User.js
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  bio: { type: String, default: "" },
  avatarUrl: { type: String, default: "" },
  // add more profile fields as needed
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  skills: { type: [String], default: [] },
  profile: { type: ProfileSchema, default: {} },
  active: { type: Boolean, default: true }
}, {
  timestamps: true // adds createdAt and updatedAt
});

// optional: nicer JSON output (remove __v, passwordHash)
UserSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  }
});

module.exports = mongoose.model('User', UserSchema);
