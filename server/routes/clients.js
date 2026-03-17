const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/clients — list current staff's clients
router.get('/', (req, res) => {
  const clients = db.prepare(`
    SELECT c.*,
      (SELECT session_number FROM sessions WHERE client_id = c.id ORDER BY session_number DESC LIMIT 1) AS last_session_number,
      (SELECT created_at FROM sessions WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_session_date
    FROM clients c
    WHERE c.staff_id = ?
    ORDER BY c.status ASC, c.updated_at DESC
  `).all(req.user.staffId);
  res.json(clients);
});

// POST /api/clients — create new client
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Client name is required' });
  }
  const result = db.prepare(
    'INSERT INTO clients (staff_id, name) VALUES (?, ?)'
  ).run(req.user.staffId, name.trim());
  res.status(201).json({ id: result.lastInsertRowid, name: name.trim(), status: 'active' });
});

// PUT /api/clients/:id/complete — mark journey complete
router.put('/:id/complete', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND staff_id = ?').get(req.params.id, req.user.staffId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  db.prepare(
    "UPDATE clients SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.id);
  res.json({ success: true });
});

// PUT /api/clients/:id/reactivate — reactivate a completed client
router.put('/:id/reactivate', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND staff_id = ?').get(req.params.id, req.user.staffId);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  db.prepare(
    "UPDATE clients SET status = 'active', updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.id);
  res.json({ success: true });
});

// GET /api/clients/:id/sessions — session history
router.get('/:id/sessions', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND staff_id = ?').get(req.params.id, req.user.staffId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  const sessions = db.prepare(
    'SELECT * FROM sessions WHERE client_id = ? ORDER BY session_number DESC'
  ).all(req.params.id);

  const result = sessions.map(s => ({
    ...s,
    plans: db.prepare('SELECT * FROM session_plans WHERE session_id = ?').all(s.id),
  }));

  res.json({ client, sessions: result });
});

module.exports = router;
