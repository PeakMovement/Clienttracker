const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();

// All staff routes require admin
router.use(auth, adminOnly);

// GET /api/staff
router.get('/', (req, res) => {
  const staff = db.prepare('SELECT id, name, profession, is_admin, created_at FROM staff ORDER BY name').all();
  res.json(staff.map(s => ({ ...s, isAdmin: s.is_admin === 1 })));
});

// POST /api/staff
router.post('/', (req, res) => {
  const { name, pin, profession, isAdmin } = req.body;
  if (!name || !pin || !profession) {
    return res.status(400).json({ error: 'name, pin, and profession are required' });
  }
  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
  }

  // Ensure PIN is unique
  const existing = db.prepare('SELECT * FROM staff').all();
  const conflict = existing.find(s => bcrypt.compareSync(pin, s.pin_hash));
  if (conflict) {
    return res.status(409).json({ error: 'That PIN is already in use by another staff member' });
  }

  const pinHash = bcrypt.hashSync(pin, 10);
  const result = db.prepare(
    'INSERT INTO staff (name, pin_hash, profession, is_admin) VALUES (?, ?, ?, ?)'
  ).run(name, pinHash, profession, isAdmin ? 1 : 0);

  res.status(201).json({ id: result.lastInsertRowid, name, profession, isAdmin: !!isAdmin });
});

// PUT /api/staff/:id
router.put('/:id', (req, res) => {
  const { name, pin, profession, isAdmin } = req.body;
  const staff = db.prepare('SELECT * FROM staff WHERE id = ?').get(req.params.id);
  if (!staff) return res.status(404).json({ error: 'Staff not found' });

  let pinHash = staff.pin_hash;
  if (pin) {
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }
    // Check uniqueness (exclude self)
    const others = db.prepare('SELECT * FROM staff WHERE id != ?').all(req.params.id);
    const conflict = others.find(s => bcrypt.compareSync(pin, s.pin_hash));
    if (conflict) {
      return res.status(409).json({ error: 'That PIN is already in use by another staff member' });
    }
    pinHash = bcrypt.hashSync(pin, 10);
  }

  db.prepare(
    'UPDATE staff SET name = ?, pin_hash = ?, profession = ?, is_admin = ? WHERE id = ?'
  ).run(
    name ?? staff.name,
    pinHash,
    profession ?? staff.profession,
    isAdmin !== undefined ? (isAdmin ? 1 : 0) : staff.is_admin,
    req.params.id
  );

  res.json({ success: true });
});

// DELETE /api/staff/:id
router.delete('/:id', (req, res) => {
  // Prevent deleting yourself
  if (parseInt(req.params.id) === req.user.staffId) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  const result = db.prepare('DELETE FROM staff WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Staff not found' });
  res.json({ success: true });
});

module.exports = router;
