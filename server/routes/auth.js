const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  }

  const staff = db.prepare('SELECT * FROM staff').all();
  const match = staff.find(s => bcrypt.compareSync(pin, s.pin_hash));

  if (!match) {
    return res.status(401).json({ error: 'Incorrect PIN' });
  }

  const token = jwt.sign(
    { staffId: match.id, isAdmin: match.is_admin === 1 },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: {
      id: match.id,
      name: match.name,
      profession: match.profession,
      isAdmin: match.is_admin === 1,
    },
  });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  const staff = db.prepare('SELECT id, name, profession, is_admin FROM staff WHERE id = ?').get(req.user.staffId);
  if (!staff) return res.status(404).json({ error: 'Staff not found' });
  res.json({
    id: staff.id,
    name: staff.name,
    profession: staff.profession,
    isAdmin: staff.is_admin === 1,
  });
});

module.exports = router;
