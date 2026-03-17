const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();
router.use(auth, adminOnly);

const planQuery = (type, extraWhere = '') => `
  SELECT
    sp.id, sp.plan_type, sp.follow_up_date, sp.google_review_asked,
    sp.refer_department, sp.is_completed, sp.created_at, sp.updated_at,
    s.session_number,
    c.name AS client_name,
    st.name AS staff_name, st.profession AS staff_profession
  FROM session_plans sp
  JOIN sessions s ON sp.session_id = s.id
  JOIN clients c ON s.client_id = c.id
  JOIN staff st ON s.staff_id = st.id
  WHERE sp.plan_type = '${type}' AND sp.is_completed = 0
  ${extraWhere}
  ORDER BY sp.created_at ASC
`;

// GET /api/admin/dashboard — counts
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const reviews = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'no_follow_up' AND is_completed = 0").get();
  const referrals = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'refer' AND is_completed = 0").get();
  const overdue = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'follow_up' AND is_completed = 0 AND follow_up_date < ?").get(today);
  const upcoming = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'follow_up' AND is_completed = 0 AND follow_up_date >= ?").get(today);
  const totalClients = db.prepare("SELECT COUNT(*) AS count FROM clients WHERE status = 'active'").get();
  const totalStaff = db.prepare("SELECT COUNT(*) AS count FROM staff WHERE is_admin = 0").get();
  res.json({
    pendingReviews: reviews.count,
    pendingReferrals: referrals.count,
    overdueFollowUps: overdue.count,
    upcomingFollowUps: upcoming.count,
    activeClients: totalClients.count,
    totalStaff: totalStaff.count,
  });
});

// GET /api/admin/pending-reviews
router.get('/pending-reviews', (req, res) => {
  const rows = db.prepare(planQuery('no_follow_up')).all();
  res.json(rows);
});

// GET /api/admin/pending-referrals
router.get('/pending-referrals', (req, res) => {
  const rows = db.prepare(planQuery('refer')).all();
  res.json(rows);
});

// GET /api/admin/overdue-followups
router.get('/overdue-followups', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(planQuery('follow_up', `AND sp.follow_up_date < '${today}'`)).all();
  res.json(rows);
});

// GET /api/admin/upcoming-followups
router.get('/upcoming-followups', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(planQuery('follow_up', `AND sp.follow_up_date >= '${today}'`)).all();
  res.json(rows);
});

// PUT /api/admin/plans/:id/complete
router.put('/plans/:id/complete', (req, res) => {
  const result = db.prepare(
    "UPDATE session_plans SET is_completed = 1, updated_at = datetime('now') WHERE id = ?"
  ).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Plan not found' });
  res.json({ success: true });
});

module.exports = router;
