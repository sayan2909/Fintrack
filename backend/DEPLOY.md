# FinTrack Backend — Deployment Guide

This guide covers deploying the **FinTrack REST API Backend** independently to popular cloud providers.

---

## 1. Required Environment Variables

Before deploying, make sure you have these environment variables set in your hosting platform:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URL (Supabase, Neon, AWS RDS) | `postgresql://postgres:password@host:6543/postgres` |
| `JWT_SECRET` | 32+ character random secret for signing JWT sessions | `fintrack_super_secret_2026_prod_key` |
| `PORT` | Listening port (typically `5000` or provided by host) | `5000` |
| `NODE_ENV` | Environment mode | `production` |

---

## 2. Deploy to Render (Web Service)

1. Push your code to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Web Service**.
3. Connect your repository and configure:
   - **Root Directory**: `backend`
   - **Environment**: `Node` (or `Docker`)
   - **Build Command**: `npm run build -- --webpack`
   - **Start Command**: `npx next start -p $PORT`
4. Under **Environment Variables**, add:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `JWT_SECRET` = your secret key
   - `NODE_ENV` = `production`
5. Click **Create Web Service**.
6. Once deployed, copy your backend URL (e.g., `https://fintrack-api.onrender.com`). You will need this for the frontend's `BACKEND_URL`.

---

## 3. Deploy to Railway

1. In [Railway Dashboard](https://railway.app), click **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. In service **Settings**:
   - Set **Root Directory** to `backend`.
   - Build command: `npm run build -- --webpack`
   - Start command: `npx next start -p $PORT`
4. In **Variables**, add `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`.
5. Under **Settings** → **Networking**, click **Generate Domain** to get your public API URL.

---

## 4. Deploy using Docker / VPS

If deploying to a VPS (Ubuntu, Debian, DigitalOcean droplet):

```bash
cd backend
docker build -t fintrack-backend .
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  --name fintrack-api \
  fintrack-backend
```

---

## 5. Seed Demo Data (Optional)

After your backend is live, seed initial categories and demo data:

```bash
curl -X POST https://your-backend-url.com/api/seed-demo -H 'Content-Type: application/json' -d '{}'
```
