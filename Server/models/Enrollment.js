const mongoose = require('mongoose');

const EnrollmentSchema = new mongoose.Schema({
  competitionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Competition', required: true },
  userId: { type: String, required: true }, // storing user id (from auth token)
  userEmail: { type: String, required: true },
  userName: { type: String },
  status: { type: String, default: 'registered' }, // reserved for future states
  createdAt: { type: Date, default: Date.now },
}, {
  collection: 'enrollments'
});

// prevent duplicate enrollments
EnrollmentSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', EnrollmentSchema);
