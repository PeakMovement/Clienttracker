const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

const VALID_DEPARTMENTS = [
  'Physio', 'Bio', 'Medicine', 'Massage',
  'Strength Trainer', 'Group Strength Class', 'Injury Rehab Class',
];

const VALID_PLAN_TYPES = ['follow_up', 'no_follow_up', 'refer'];

// POST /api/sessions
router.post('/', (req, res) => {
  const { clientId, sessionNumber, plans } = req.body;

  if (!clientId || !sessionNumber || !plans || !Array.isArray(plans) || plans.length === 0) {
    return res.status(400).json({ error: 'clientId, sessionNumber, and at least one plan are required' });
  }

  // Verify client belongs to this staff member
  const client = db.prepare('SELECT * FROM clients WHERE id = ? AND staff_id = ?').get(clientId, req.user.staffId);
  if (!client) return res.status(404).json({ error: 'Client not found' });

  // Validate each plan
  for (const plan of plans) {
    if (!VALID_PLAN_TYPES.includes(plan.type)) {
      return res.status(400).json({ error: `Invalid plan type: ${plan.type}` });
    }
    if (plan.type === 'follow_up' && !plan.followUpDate) {
      return res.status(400).json({ error: 'follow_up plan requires a followUpDate' });
    }
    if (plan.type === 'no_follow_up' && plan.googleReviewAsked === undefined) {
      return res.status(400).json({ error: 'no_follow_up plan requires googleReviewAsked (true/false)' });
    }
    if (plan.type === 'refer' && !VALID_DEPARTMENTS.includes(plan.referDepartment)) {
      return res.status(400).json({ error: `refer plan requires a valid referDepartment` });
    }
  }

  const insertSession = db.prepare(
    'INSERT INTO sessions (client_id, staff_id, session_number) VALUES (?, ?, ?)'
  );
  const insertPlan = db.prepare(`
    INSERT INTO session_plans (session_id, plan_type, follow_up_date, google_review_asked, refer_department)
    VALUES (?, ?, ?, ?, ?)
  `);

  const createSession = db.transaction(() => {
    const sessionResult = insertSession.run(clientId, req.user.staffId, sessionNumber);
    const sessionId = sessionResult.lastInsertRowid;
    for (const plan of plans) {
      insertPlan.run(
        sessionId,
        plan.type,
        plan.followUpDate ?? null,
        plan.type === 'no_follow_up' ? (plan.googleReviewAsked ? 1 : 0) : null,
        plan.referDepartment ?? null
      );
    }
    // Update client's updated_at
    db.prepare("UPDATE clients SET updated_at = datetime('now') WHERE id = ?").run(clientId);
    return sessionId;
  });

  const sessionId = createSession();
  res.status(201).json({ id: sessionId });
});

module.exports = router;
