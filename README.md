# FinTrack — Financial Analytics & Tracking Platform

A modern, high-performance personal finance platform built with **Pure React (Vite)** on the frontend and **Node.js (Express + TypeScript)** on the backend.

> [!NOTE]
> **Zero Next.js, Zero Apache, Zero PHP**
> FinTrack does **not** use Next.js, Apache, PHP, or XAMPP. It runs purely on standard Node.js and Vite.

---

## 🏛️ Architecture

```
Fintrack/
├── backend/            # Express REST API Server (Port 5000)
│   ├── src/routes/     # Auth, Transactions, Budgets, Analytics, Goals, Accounts
│   ├── src/db/         # PostgreSQL (Supabase / local embedded PGlite) + Drizzle ORM
│   ├── src/server.ts   # Express server entry point
│   └── .env            # PORT=5000, USE_PGLITE=true (or DATABASE_URL)
│
├── frontend/           # Pure React SPA with Vite (Port 5173)
│   ├── src/app/        # React Pages (Dashboard, Analytics, Budgets, etc.)
│   ├── src/components/ # Design system, Charts, AppShell navigation
│   ├── src/App.tsx     # React Router configuration
│   ├── src/main.tsx    # React root mount
│   ├── index.html      # SPA HTML entry point
│   └── vite.config.ts  # Vite config + Proxy to localhost:5000
│
├── package.json        # Root workspace orchestrator
├── run-dev.js          # Concurrent development runner (both services)
├── run-start.js        # Production runner (both services)
├── dev.bat             # Windows one-click development launcher
└── start.bat           # Windows one-click production launcher
```

---

## 🚀 Quick Start (Development)

Requires **Node.js 18+**.

### Run Both Services Together (Recommended)

From the project root:

```bash
npm run dev
```

*(This runs Express on `http://localhost:5000` and Vite on `http://localhost:5173` concurrently with unified logs).*

### Or Use Windows One-Click Launcher

Double-click `dev.bat` in File Explorer.

### Or Run Independently in Two Terminals

- **Terminal 1 (Backend - Express API)**:
  ```bash
  cd backend
  npm run dev
  ```
- **Terminal 2 (Frontend - React + Vite)**:
  ```bash
  cd frontend
  npm run dev
  ```

---

## 🌐 URLs & Endpoints

| Service | Port / URL | Description |
| :--- | :--- | :--- |
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) | Pure React SPA (Vite with hot module reload) |
| **Backend API** | [http://localhost:5000/api](http://localhost:5000/api) | Express REST API |
| **API Health** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | System health & DB connection status |

---

## 📦 Production Build & Run

```bash
# 1. Build both services
npm run build

# 2. Start production servers
npm start
```

Or double-click `start.bat` on Windows.
