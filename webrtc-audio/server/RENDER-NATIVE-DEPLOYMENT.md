# Render Native Node.js Deployment Configuration

## Service Configuration
- **Type**: Web Service (Native Node.js)
- **Environment**: Node.js
- **Plan**: Starter (or higher for production)
- **Region**: Oregon (or closest to your users)

## Repository Settings
- **Repository**: https://github.com/satyam16-ai/Gyandhara-SIH-project
- **Branch**: main
- **Root Directory**: webrtc-audio/server

## Build & Deploy Commands
- **Build Command**: `npm install --verbose`
- **Start Command**: `npm start`

## Required Environment Variables
```
NODE_ENV=production
PORT=10000
NODE_VERSION=20.11.0
LOG_LEVEL=info
CORS_ORIGIN=https://gyandhara-tau.vercel.app,https://gyandhara-satyam.vercel.app
NUM_WORKERS=auto
TRUST_PROXY=true
NPM_CONFIG_PRODUCTION=false
```

## Health Check Settings
- **Health Check Path**: `/health`
- **Timeout**: 30 seconds
- **Interval**: 30 seconds
- **Retries**: 3

## Auto Deploy Settings
- **Auto Deploy**: No (manual control)
- **Build Filter**: `webrtc-audio/server/**`

## Native Node.js Benefits
✅ Faster builds (no Docker overhead)
✅ Better resource utilization
✅ Automatic Node.js environment management
✅ Built-in process management
✅ Native npm/yarn support
✅ Optimized for Node.js applications

## Manual Deployment Steps

1. **Create New Web Service**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```
   Name: gyandhara-audio-sfu
   Environment: Node
   Root Directory: webrtc-audio/server
   Build Command: npm install --verbose
   Start Command: npm start
   ```

3. **Set Environment Variables**
   Copy and paste the environment variables listed above

4. **Deploy**
   - Click "Create Web Service"
   - Monitor build logs for any issues

## Troubleshooting Native Deployment

### Build Issues
- Check Node.js version compatibility (>=20.0.0)
- Verify all dependencies in package.json
- Monitor build logs for specific error messages

### Runtime Issues
- Check health endpoint: `https://your-app.onrender.com/health`
- Monitor application logs in Render dashboard
- Verify environment variables are set correctly

### Mediasoup Specific
- Ensure Node.js 20+ is being used
- Check that python3 and build tools are available
- Monitor worker initialization in logs