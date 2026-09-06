# FinTrack Frontend — Deployment Guide

This guide covers deploying the **FinTrack Frontend UI Client** independently to popular platforms like Vercel, Netlify, or Docker.

---

## 1. Required Environment Variables

| Variable | Description | Example |
| :--- | :--- | :--- |
| `BACKEND_URL` | The public URL of your deployed Backend REST API server | `https://fintrack-api.onrender.com` |
| `NODE_ENV` | Environment mode | `production` |

---

## 2. Deploy to Vercel (Recommended)

1. Push your repository to GitHub.
2. In [Vercel Dashboard](https://vercel.com/new), click **Add New...** → **Project**.
3. Select your GitHub repository.
4. In the **Configure Project** screen:
   - **Root Directory**: Click *Edit* and select **`frontend`**.
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build -- --webpack` (or default `npm run build`)
5. Under **Environment Variables**, add:
   - **Name**: `BACKEND_URL`
   - **Value**: `https://your-deployed-backend-url.com` (from your Render, Railway, or VPS deployment)
6. Click **Deploy**.

> [!TIP]
> **Why this architecture works flawlessly**:
> Next.js's built-in `rewrites()` in `frontend/next.config.ts` automatically proxies all browser requests to `/api/*` directly to your `BACKEND_URL`. This eliminates all CORS issues, and cookies are treated as first-party cookies by all browsers!

---

## 3. Deploy to Netlify

1. In [Netlify Dashboard](https://app.netlify.com), click **Add new site** → **Import an existing project**.
2. Connect to GitHub and select the repository.
3. Configuration:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build -- --webpack`
   - **Publish directory**: `frontend/.next`
4. In **Site configuration** → **Environment variables**:
   - Set `BACKEND_URL` to your backend URL.
5. Click **Deploy site**.

---

## 4. Deploy using Docker / VPS

```bash
cd frontend
docker build -t fintrack-frontend .
docker run -d \
  -p 3000:3000 \
  -e BACKEND_URL="https://your-backend-url.com" \
  --name fintrack-ui \
  fintrack-frontend
```
