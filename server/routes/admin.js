const express = require('express');
const db = require('../db');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

const router = express.Router();
router.use(auth, adminOnly);

const PLAN_SELECT = `
  SELECT
    sp.id, sp.plan_type, sp.follow_up_date, sp.google_review_asked,
    sp.refer_department, sp.is_completed, sp.created_at, sp.updated_at,
    sp.google_review_deadline,
    s.session_number,
    c.name AS client_name,
    st.name AS staff_name, st.profession AS staff_profession
  FROM session_plans sp
  JOIN sessions s ON sp.session_id = s.id
  JOIN clients c ON s.client_id = c.id
  JOIN staff st ON s.staff_id = st.id
`;

// GET /api/admin/dashboard — counts
router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const reviews = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'no_follow_up' AND is_completed = 0").get();
  const referrals = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'refer' AND is_completed = 0").get();
  const overdue = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'follow_up' AND is_completed = 0 AND follow_up_date < ?").get(today);
  const upcoming = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'follow_up' AND is_completed = 0 AND follow_up_date >= ?").get(today);
  const overdueReviews = db.prepare("SELECT COUNT(*) AS count FROM session_plans WHERE plan_type = 'no_follow_up' AND google_review_asked = 1 AND is_completed = 0 AND google_review_deadline < ?").get(today);
  const totalClients = db.prepare("SELECT COUNT(*) AS count FROM clients WHERE status = 'active'").get();
  const totalStaff = db.prepare("SELECT COUNT(*) AS count FROM staff WHERE is_admin = 0").get();
  res.json({
    pendingReviews: reviews.count,
    pendingReferrals: referrals.count,
    overdueFollowUps: overdue.count,
    upcomingFollowUps: upcoming.count,
    overdueGoogleReviews: overdueReviews.count,
    activeClients: totalClients.count,
    totalStaff: totalStaff.count,
  });
});

// GET /api/admin/pending-reviews
router.get('/pending-reviews', (req, res) => {
  const rows = db.prepare(
    PLAN_SELECT + `WHERE sp.plan_type = 'no_follow_up' AND sp.is_completed = 0 ORDER BY sp.created_at ASC`
  ).all();
  res.json(rows);
});

// GET /api/admin/pending-referrals
router.get('/pending-referrals', (req, res) => {
  const rows = db.prepare(
    PLAN_SELECT + `WHERE sp.plan_type = 'refer' AND sp.is_completed = 0 ORDER BY sp.created_at ASC`
  ).all();
  res.json(rows);
});

// GET /api/admin/overdue-followups
router.get('/overdue-followups', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    PLAN_SELECT + `WHERE sp.plan_type = 'follow_up' AND sp.is_completed = 0 AND sp.follow_up_date < ? ORDER BY sp.created_at ASC`
  ).all(today);
  res.json(rows);
});

// GET /api/admin/upcoming-followups
router.get('/upcoming-followups', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(
    PLAN_SELECT + `WHERE sp.plan_type = 'follow_up' AND sp.is_completed = 0 AND sp.follow_up_date >= ? ORDER BY sp.created_at ASC`
  ).all(today);
  res.json(rows);
});

// GET /api/admin/overdue-reviews — Google review not marked complete within 2 days
router.get('/overdue-reviews', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const rows = db.prepare(`
    SELECT
      sp.id, sp.plan_type, sp.follow_up_date, sp.google_review_asked,
      sp.refer_department, sp.is_completed, sp.created_at, sp.updated_at,
      sp.google_review_deadline,
      s.session_number,
      c.name AS client_name,
      st.name AS staff_name, st.profession AS staff_profession
    FROM session_plans sp
    JOIN sessions s ON sp.session_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN staff st ON s.staff_id = st.id
    WHERE sp.plan_type = 'no_follow_up'
      AND sp.google_review_asked = 1
      AND sp.is_completed = 0
      AND sp.google_review_deadline < ?
    ORDER BY sp.google_review_deadline ASC
  `).all(today);
  res.json(rows);
});

// GET /api/admin/predictive-clients
router.get('/predictive-clients', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.name, c.email, c.predictive_flagged_at, c.status,
      st.name AS staff_name, st.profession AS staff_profession,
      (SELECT session_number FROM sessions WHERE client_id = c.id ORDER BY session_number DESC LIMIT 1) AS last_session_number,
      (SELECT created_at FROM sessions WHERE client_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_session_date
    FROM clients c
    JOIN staff st ON c.staff_id = st.id
    WHERE c.predictive = 1
    ORDER BY c.predictive_flagged_at DESC
  `).all();
  res.json(rows);
});

// PUT /api/admin/predictive-clients/:id/contact-status
router.put('/predictive-clients/:id/contact-status', (req, res) => {
  const { status } = req.body; // 'invited' | 'declined'
  if (!['invited', 'declined'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.prepare(`UPDATE clients SET predictive = 0, predictive_contact_status = ? WHERE id = ?`).run(status, req.params.id);
  res.json({ ok: true });
});

// GET /api/admin/followup-calendar — all incomplete plans with a relevant date
router.get('/followup-calendar', (req, res) => {
  const rows = db.prepare(`
    SELECT
      sp.id, sp.plan_type, sp.follow_up_date, sp.google_review_deadline,
      sp.refer_department,
      c.name AS client_name,
      st.name AS staff_name, st.profession AS staff_profession,
      s.session_number,
      CASE
        WHEN sp.plan_type = 'follow_up'    THEN sp.follow_up_date
        WHEN sp.plan_type = 'no_follow_up' THEN sp.google_review_deadline
        ELSE date(sp.created_at)
      END AS calendar_date
    FROM session_plans sp
    JOIN sessions s ON sp.session_id = s.id
    JOIN clients c ON s.client_id = c.id
    JOIN staff st ON s.staff_id = st.id
    WHERE sp.is_completed = 0
      AND (
        (sp.plan_type = 'follow_up'    AND sp.follow_up_date IS NOT NULL)
        OR (sp.plan_type = 'no_follow_up' AND sp.google_review_deadline IS NOT NULL)
        OR sp.plan_type = 'refer'
      )
    ORDER BY calendar_date ASC
  `).all();
  res.json(rows);
});

// POST /api/admin/import-bookings
// Body: { groups: [{ clientName, clientEmail, staffId, sessions: [{date, service}], plan }] }
router.post('/import-bookings', (req, res) => {
  const { groups } = req.body;
  if (!Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ error: 'groups array required' });
  }

  const results = { imported: 0, skipped: 0, errors: [] };

  const insertClient = db.prepare(
    'INSERT INTO clients (name, email, staff_id) VALUES (?, ?, ?)'
  );
  const insertSession = db.prepare(
    'INSERT INTO sessions (client_id, staff_id, session_number, created_at) VALUES (?, ?, ?, ?)'
  );
  const insertPlan = db.prepare(`
    INSERT INTO session_plans (session_id, plan_type, follow_up_date, google_review_asked, refer_department, google_review_deadline)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const importGroup = db.transaction((group) => {
    const { clientName, clientEmail, staffId, sessions, plan } = group;

    // Find or create client
    let client = null;
    if (clientEmail) {
      client = db.prepare('SELECT * FROM clients WHERE email = ? AND staff_id = ?').get(clientEmail, staffId);
    }
    if (!client) {
      client = db.prepare(
        'SELECT * FROM clients WHERE lower(name) = lower(?) AND staff_id = ?'
      ).get(clientName, staffId);
    }
    if (!client) {
      const r = insertClient.run(clientName, clientEmail || null, staffId);
      client = { id: r.lastInsertRowid };
    } else if (clientEmail && !client.email) {
      // Backfill email if we matched by name
      db.prepare('UPDATE clients SET email = ? WHERE id = ?').run(clientEmail, client.id);
    }

    // Determine next session number
    const maxRow = db.prepare('SELECT MAX(session_number) AS max FROM sessions WHERE client_id = ?').get(client.id);
    let nextNum = (maxRow.max || 0) + 1;

    let lastSessionId = null;
    for (const session of sessions) {
      const createdAt = session.date ? `${session.date}T${session.startTime || '00:00'}:00` : null;
      const r = insertSession.run(client.id, staffId, nextNum, createdAt || new Date().toISOString());
      lastSessionId = r.lastInsertRowid;
      nextNum++;
    }

    // Attach plan to last session
    if (lastSessionId && plan && plan.type) {
      const reviewDeadline = (plan.type === 'no_follow_up' && plan.googleReviewAsked)
        ? new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : null;
      insertPlan.run(
        lastSessionId,
        plan.type,
        plan.followUpDate ?? null,
        plan.type === 'no_follow_up' ? (plan.googleReviewAsked ? 1 : 0) : null,
        plan.referDepartment ?? null,
        reviewDeadline
      );
      db.prepare("UPDATE clients SET updated_at = datetime('now') WHERE id = ?").run(client.id);
    }

    return sessions.length;
  });

  for (const group of groups) {
    try {
      const count = importGroup(group);
      results.imported += count;
    } catch (err) {
      results.skipped++;
      results.errors.push(`${group.clientName} (${group.staffName}): ${err.message}`);
    }
  }

  res.json(results);
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
