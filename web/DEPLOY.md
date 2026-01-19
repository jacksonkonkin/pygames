# Deployment Guide

## Quick Fix for Vercel 404 Error

Your Vercel project is looking in the wrong directory. Here's how to fix it:

### Option 1: Set Root Directory in Vercel (Recommended)

1. Go to your Vercel project dashboard
2. Click **Settings** → **General**
3. Scroll to **Root Directory**
4. Set it to: `web`
5. Click **Save**
6. **Redeploy** your project

### Option 2: Deploy from the `web/` Directory

If you're using Vercel CLI:

```bash
cd web
vercel --prod
```

This will deploy the `web/` folder as the root.

### Option 3: Use Vercel Dashboard

1. In Vercel dashboard, go to **Settings** → **Git**
2. Under **Root Directory**, select `web`
3. Save and redeploy

---

## After Fixing

Once the root directory is set correctly, your site should be accessible at:
- `https://your-project.vercel.app/`
- `https://your-project.vercel.app/game.html?g=pong`
- `https://your-project.vercel.app/game.html?g=space_invaders`
