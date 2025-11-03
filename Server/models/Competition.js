// server/models/Competition.js
const mongoose = require('mongoose');

const CompetitionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 300 },
  description: { type: String, default: "" },
  domain: { type: String, default: "" },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  skills: { type: [String], default: [] }, // tech stack / required skills
  maxMembers: { type: Number, default: 5 },
  createdBy: { type: String, required: true }, // createdBy user email (lowercased)
  registered: { type: [String], default: [] }, // array of user emails (lowercased)
  createdAt: { type: Date, default: Date.now },
});

CompetitionSchema.virtual('registeredCount').get(function() {
  return (this.registered || []).length;
});

CompetitionSchema.set('toJSON', { virtuals: true });
CompetitionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Competition', CompetitionSchema);
