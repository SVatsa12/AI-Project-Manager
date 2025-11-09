// Server/routes/students.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const bcrypt = require('bcrypt');

// GET all students - Admin only
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Find all users with role 'student', exclude password
    const students = await User.find({ role: 'student' })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ ok: true, students });
  } catch (e) {
    console.error('Get students error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST create student manually - Admin only
router.post('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, email, password = 'defaultPassword123' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Check if student already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ message: 'Student with this email already exists' });
    }

    // Create new student
    const passwordHash = await bcrypt.hash(password, 10);
    const newStudent = new User({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student'
    });

    await newStudent.save();

    // Return student without password
    const studentData = {
      _id: newStudent._id,
      name: newStudent.name,
      email: newStudent.email,
      role: newStudent.role,
      createdAt: newStudent.createdAt
    };

    res.status(201).json({ ok: true, student: studentData });
  } catch (e) {
    console.error('Create student error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE student - Admin only
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const student = await User.findByIdAndDelete(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ ok: true, message: 'Student deleted successfully' });
  } catch (e) {
    console.error('Delete student error:', e);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;