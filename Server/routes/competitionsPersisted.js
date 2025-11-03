// server/routes/competitionsPersisted.js
const express = require('express');
const Competition = require('../models/Competition');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// helper: normalize email
function normEmail(email) {
  if (!email) return '';
  return String(email).toLowerCase().trim();
}

// GET /api/competitions/persisted
// public read (optionally authenticated) - returns items array
router.get('/persisted', async (req, res) => {
  try {
    const items = await Competition.find().sort({ startDate: 1, createdAt: -1 }).lean();
    res.json({ ok: true, items });
  } catch (e) {
    console.error('GET persisted error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/competitions/persisted
// create new competition - admin only
router.post('/persisted', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'admin only' });

    const { title, description, domain, startDate, endDate, skills = [], maxMembers = 5 } = req.body || {};
    if (!title) return res.status(400).json({ ok: false, error: 'title required' });

    const comp = new Competition({
      title: String(title).trim(),
      description: description || '',
      domain: domain || '',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      skills: (skills || []).map(s => String(s).trim()).filter(Boolean),
      maxMembers: Number(maxMembers) || 5,
      createdBy: normEmail(user.email),
      registered: []
    });

    await comp.save();

    // broadcast via socket.io if available
    const io = req.app.get('io');
    if (io) io.emit('competition:created', comp.toObject());

    res.json({ ok: true, competition: comp });
  } catch (e) {
    console.error('POST persisted error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /api/competitions/persisted/:id/enroll
// enroll current user by email
router.post('/persisted/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'unauthenticated' });

    const comp = await Competition.findById(req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'competition not found' });

    const email = normEmail(user.email);

    if (comp.registered.includes(email)) {
      return res.json({ ok: true, message: 'already enrolled', registeredCount: comp.registered.length });
    }

    if (comp.registered.length >= (comp.maxMembers || 5)) {
      return res.status(400).json({ ok: false, error: 'competition full' });
    }

    comp.registered.push(email);
    await comp.save();

    const io = req.app.get('io');
    if (io) io.emit('competition:enrollment', { competitionId: comp._id, action: 'enrolled', registeredCount: comp.registered.length });

    res.json({ ok: true, registeredCount: comp.registered.length, competition: comp });
  } catch (e) {
    console.error('enroll error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DELETE /api/competitions/persisted/:id/enroll
// unenroll current user
router.delete('/persisted/:id/enroll', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ ok: false, error: 'unauthenticated' });

    const comp = await Competition.findById(req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'competition not found' });

    const email = normEmail(user.email);
    const idx = comp.registered.indexOf(email);
    if (idx === -1) return res.json({ ok: true, message: 'not enrolled', registeredCount: comp.registered.length });

    comp.registered.splice(idx, 1);
    await comp.save();

    const io = req.app.get('io');
    if (io) io.emit('competition:enrollment', { competitionId: comp._id, action: 'unenrolled', registeredCount: comp.registered.length });

    res.json({ ok: true, registeredCount: comp.registered.length, competition: comp });
  } catch (e) {
    console.error('unenroll error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Admin: POST /persisted/:id/enroll-as  { email }  -> enroll a user (admin manually from Students tab)
router.post('/persisted/:id/enroll-as', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'admin only' });

    const { email } = req.body || {};
    if (!email) return res.status(400).json({ ok: false, error: 'email required' });

    const comp = await Competition.findById(req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'competition not found' });

    const norm = (email || '').toLowerCase().trim();
    if (!norm) return res.status(400).json({ ok: false, error: 'invalid email' });

    if (!comp.registered.includes(norm)) {
      if (comp.registered.length >= (comp.maxMembers || 5)) {
        return res.status(400).json({ ok: false, error: 'competition full' });
      }
      comp.registered.push(norm);
      await comp.save();
    }

    const io = req.app.get('io');
    if (io) io.emit('competition:enrollment', { competitionId: comp._id, action: 'enrolled', registeredCount: comp.registered.length });

    res.json({ ok: true, registeredCount: comp.registered.length, competition: comp });
  } catch (e) {
    console.error('enroll-as error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Admin: DELETE /persisted/:id (optional)
router.delete('/persisted/:id', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'admin') return res.status(403).json({ ok: false, error: 'admin only' });

    const comp = await Competition.findByIdAndDelete(req.params.id);
    if (!comp) return res.status(404).json({ ok: false, error: 'competition not found' });

    const io = req.app.get('io');
    if (io) io.emit('competition:removed', { competitionId: req.params.id });

    res.json({ ok: true, removed: comp });
  } catch (e) {
    console.error('delete comp error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
