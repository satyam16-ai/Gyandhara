# Render Deployment Steps - Native Node.js

## ✅ Pre-Deployment Checklist (COMPLETED)
- [x] Docker files removed (to prevent Docker detection)
- [x] render.yaml configured for native Node.js deployment
- [x] Package.json optimized with Node.js 20+ requirement
- [x] Server.js configured with Render environment detection
- [x] Health check endpoints implemented
- [x] CORS configured for production domains
- [x] Changes committed and pushed to GitHub

## 🚀 Deployment Steps

### 1. Create Render Service
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `satyam16-ai/Gyandhara-SIH-project`
4. Configure the service:
   - **Name**: `gyandhara-audio-sfu`
   - **Environment**: `Node`
   - **Build Command**: `npm install --verbose`
   - **Start Command**: `npm start`
   - **Root Directory**: `webrtc-audio/server`

### 2. Environment Variables
Add these environment variables in Render dashboard:
```
NODE_ENV=production
PORT=10000
NODE_VERSION=20.11.0
LOG_LEVEL=info
```

### 3. Advanced Settings
- **Health Check Path**: `/health`
- **Auto-Deploy**: Disable (manual control)
- **Instance Type**: Starter (can upgrade later)

### 4. Deploy
1. Click "Create Web Service"
2. Wait for build to complete (should be much faster than Docker)
3. Check logs for "🚀 Gyandhara Audio SFU Server running on Render"

## 🔍 Verification
After deployment, test these endpoints:
- `https://your-service-url.onrender.com/health` - Should return "OK"
- `https://your-service-url.onrender.com/` - Should return server info

## 🐛 Troubleshooting
If build fails:
1. Check that Node.js version is 20+
2. Verify no Docker files exist in the repository
3. Check build logs for mediasoup compilation errors
4. Ensure render.yaml is in the root directory

## 📝 Notes
- Native Node.js deployment avoids Docker complexity
- mediasoup requires Node.js 20+ for proper compilation
- Build time should be ~3-5 minutes (much faster than Docker)
- Service will auto-restart on crashes with health checks