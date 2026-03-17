# Client Tracker

A web app for tracking client sessions across your team. Designed for iPads on a local WiFi network.

## Quick Start

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start in development mode

```bash
npm run dev
```

- Server: http://localhost:3001
- Client: http://localhost:5173

### 3. Production (for iPad access on local network)

```bash
# Build the frontend
npm run build

# Start the server
npm run start
```

Then find your computer's local IP address:
- **Mac/Linux**: run `ifconfig | grep "inet "` in terminal
- **Windows**: run `ipconfig` in command prompt, look for IPv4 Address

On each iPad, open Safari and go to: `http://YOUR-IP-ADDRESS:3001`

---

## Default Admin Login

On first launch, a default admin account is created:
- **PIN**: `0000`
- **Name**: Admin

**Important:** Log in immediately and change this PIN via Staff Management → Edit.

---

## Features

### Staff
- Log in with a 4-digit PIN
- Dashboard shows all your active clients
- Tap a client to view their full session history
- **Add Session** on any client to log a new session
- Choose next session plan (one or more):
  - **Follow Up** — set a follow-up date
  - **No Follow Up** — record whether a Google review was requested
  - **Refer** — select a department to refer to
- **Complete Journey** once a client's treatment is finished

### Admin (Boss)
- Overview dashboard with live counts
- **Pending Reviews** — clients awaiting Google review follow-through
- **Pending Referrals** — clients awaiting referral completion
- **Overdue Follow-Ups** — clients whose follow-up date has passed
- **Upcoming Follow-Ups** — scheduled follow-ups not yet due
- Mark any item as complete to clear it from the list
- Dashboard auto-refreshes every 30 seconds
- **Staff Management** — add, edit, or remove staff members

### Departments for referrals
Physio · Bio · Medicine · Massage · Strength Trainer · Group Strength Class · Injury Rehab Class

---

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (stored at `server/data/tracker.db`)
- **Auth**: 4-digit PIN → JWT (8-hour sessions)

---

## Data Backup

The entire database is a single file: `server/data/tracker.db`

To back up, simply copy this file. To restore, replace it with your backup.
