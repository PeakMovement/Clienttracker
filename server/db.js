const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

// Priority: DATA_DIR env var → /data volume (Railway auto-detect) → local server/data/
const dataDir = process.env.DATA_DIR
  || (fs.existsSync('/data') ? '/data' : path.join(__dirname, 'data'));
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'tracker.db');
console.log(`[db] Using database at: ${dbPath} (DATA_DIR=${process.env.DATA_DIR || 'not set'})`);
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    profession TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    session_number INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS session_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    follow_up_date TEXT,
    google_review_asked INTEGER,
    refer_department TEXT,
    is_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migrate: add google_review_deadline column if not already present
try {
  db.exec(`ALTER TABLE session_plans ADD COLUMN google_review_deadline TEXT`);
} catch (_) { /* column already exists */ }

// Migrate: add email column to clients for import matching
try {
  db.exec(`ALTER TABLE clients ADD COLUMN email TEXT`);
} catch (_) { /* column already exists */ }

// Migrate: add predictive flag to clients
try {
  db.exec(`ALTER TABLE clients ADD COLUMN predictive INTEGER NOT NULL DEFAULT 0`);
} catch (_) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE clients ADD COLUMN predictive_flagged_at TEXT`);
} catch (_) { /* column already exists */ }
try {
  db.exec(`ALTER TABLE clients ADD COLUMN predictive_contact_status TEXT`);
} catch (_) { /* column already exists */ }

// Seed default admin if none exists
const adminExists = db.prepare('SELECT id FROM staff WHERE is_admin = 1').get();
if (!adminExists) {
  const pinHash = bcrypt.hashSync('0000', 10);
  db.prepare(
    'INSERT INTO staff (name, pin_hash, profession, is_admin) VALUES (?, ?, ?, 1)'
  ).run('Admin', pinHash, 'Manager');
  console.log('Default admin created: PIN = 0000 (change this immediately in Staff Management)');
}

// Seed known staff members if they don't exist yet (only inserts, never overwrites changed PINs)
const staffSeeds = [
  { name: 'Luyolo',   profession: 'Biokineticist',   pin: '1234' },
  { name: 'Zoe',      profession: 'Physiotherapist', pin: '0407' },
  { name: 'Tasneem',  profession: 'Physiotherapist', pin: '1236' },
  { name: 'Justin',   profession: 'Physiotherapist', pin: '1237' },
  { name: 'Tayla',    profession: 'Physiotherapist', pin: '1238' },
  { name: 'Kashmira', profession: 'Physiotherapist', pin: '1239' },
];
for (const s of staffSeeds) {
  const exists = db.prepare('SELECT id FROM staff WHERE name = ?').get(s.name);
  if (!exists) {
    const hash = bcrypt.hashSync(s.pin, 10);
    db.prepare('INSERT INTO staff (name, pin_hash, profession, is_admin) VALUES (?, ?, ?, 0)').run(s.name, hash, s.profession);
    console.log(`Staff seeded: ${s.name} (${s.profession})`);
  }
}

module.exports = db;
