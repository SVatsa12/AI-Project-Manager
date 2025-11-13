const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  assignee: { type: String, default: '' },
  description: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  startDate: { type: String, required: true }, // YYYY-MM-DD format
  endDate: { type: String, required: true },   // YYYY-MM-DD format
  techStack: { type: String, default: '' },
  maxMembers: { type: Number, required: true },
  members: [{ type: String }], // Array of member emails
  userProgress: { type: mongoose.Schema.Types.Mixed, default: {} }, // Plain object: email -> progress status
  tasks: [taskSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for faster queries
projectSchema.index({ status: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;
