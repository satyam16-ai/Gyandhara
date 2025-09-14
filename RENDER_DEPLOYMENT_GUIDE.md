# 🚀 Render Backend Deployment Guide

## Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up for a free account
3. Connect your GitHub account

## Step 2: Deploy Backend to Render

### Option A: Manual Deploy (Recommended)
1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Choose "Build and deploy from a Git repository"
   - Connect your GitHub repository: `satyam16-ai/voiceboard-educational-platform`

2. **Configure Service**
   - **Name**: `gyandhara-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `feature/parent-portal-system` 
   - **Root Directory**: `server` (IMPORTANT!)
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

3. **Set Environment Variables**
   Add these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=mongodb+srv://satyam_ai:satyamtiwari01@gyandhara.ordgmuf.mongodb.net/gyaandhara?retryWrites=true&w=majority&appName=GYANDHARA
   FRONTEND_URL=https://gyandhara-n1arsqflk-nitin8360s-projects.vercel.app
   JWT_SECRET=gyandhara-super-secure-jwt-production-key-2025
   BCRYPT_SALT_ROUNDS=12
   GEMINI_API_KEY=AIzaSyAnpgC4ow_OJ2aW_jNffF54ZMAkJpBjESI
   ENABLE_AI_FEATURES=true
   ENABLE_EMAIL_NOTIFICATIONS=true
   ENABLE_COMPRESSION=true
   MAX_PARTICIPANTS_PER_SESSION=50
   RATE_LIMIT_MAX_REQUESTS=200
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)

### Option B: Using render.yaml (Alternative)
1. Ensure `render.yaml` is in your repo root
2. Deploy via Render Dashboard
3. Choose "Use render.yaml"

## Step 3: Test Backend Deployment
Once deployed, your backend will be available at:
```
https://gyandhara-backend.onrender.com
```

Test endpoints:
- Health Check: `https://gyandhara-backend.onrender.com/health`
- API Health: `https://gyandhara-backend.onrender.com/api/health`

## Step 4: Update Frontend Environment Variables
Update Vercel environment variables:

```bash
# Via Vercel CLI
vercel env add BACKEND_URL
# Enter: https://gyandhara-backend.onrender.com

vercel env add NEXT_PUBLIC_BACKEND_URL  
# Enter: https://gyandhara-backend.onrender.com
```

Or in Vercel Dashboard:
1. Go to your project settings
2. Environment Variables
3. Add:
   - `BACKEND_URL`: `https://gyandhara-backend.onrender.com`
   - `NEXT_PUBLIC_BACKEND_URL`: `https://gyandhara-backend.onrender.com`

## Step 5: Redeploy Frontend
```bash
vercel --prod
```

## ⚠️ Important Notes:

### Free Tier Limitations:
- **Sleep Mode**: Render free tier sleeps after 15 minutes of inactivity
- **Cold Start**: First request after sleep takes 10-30 seconds
- **750 hours/month**: Free tier limit

### Database Connection:
- MongoDB Atlas is already configured
- Connection string includes authentication
- Database will be shared between deployments

### CORS Configuration:
- Backend is configured to accept requests from your Vercel frontend
- Vercel URL is whitelisted in CORS settings

## 🔄 Deployment Complete!

After completing these steps:
1. ✅ Backend running on Render
2. ✅ Frontend running on Vercel  
3. ✅ Database on MongoDB Atlas
4. ✅ Full-stack application connected

**Frontend**: https://gyandhara-n1arsqflk-nitin8360s-projects.vercel.app
**Backend**: https://gyandhara-backend.onrender.com
**Database**: MongoDB Atlas

Test the admin login at:
https://gyandhara-n1arsqflk-nitin8360s-projects.vercel.app/admin-login