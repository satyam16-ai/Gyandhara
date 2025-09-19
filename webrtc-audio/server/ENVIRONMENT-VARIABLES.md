# Environment Variables Configuration

## 🔧 Complete Environment Variables Guide

This document explains all environment variables used by the Gyandhara Audio SFU Server for deployment on Render.

### 📋 Core Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Application environment (production/development) |
| `PORT` | number | `3001` | Server port (Render sets this automatically) |
| `NODE_VERSION` | string | `20.11.0` | Required Node.js version |
| `LOG_LEVEL` | string | `info` | Logging level (debug/info/warn/error) |
| `SERVER_NAME` | string | `gyandhara-audio-sfu` | Service identifier |

### 🔨 Build Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NPM_CONFIG_PRODUCTION` | boolean | `false` | Install dev dependencies during build |
| `NPM_CONFIG_CACHE` | string | `/tmp/.npm` | npm cache directory |

### 🎵 mediasoup Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MEDIASOUP_MIN_PORT` | number | `20000` | Minimum RTC port |
| `MEDIASOUP_MAX_PORT` | number | `20100` | Maximum RTC port |
| `MEDIASOUP_ANNOUNCED_IP` | string | `auto` | Public IP for WebRTC |

### 🌐 CORS and Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_CORS` | boolean | `true` | Enable CORS middleware |
| `ALLOWED_ORIGINS` | string | *(see below)* | Comma-separated list of allowed origins |

#### Default ALLOWED_ORIGINS:
```
https://gyandhara-tau.vercel.app,https://gyandhara-backend.onrender.com,https://webrtc-server-sih.onrender.com,http://localhost:3000,http://localhost:5173
```

### 🏥 Health Check Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HEALTH_CHECK_ENABLED` | boolean | `true` | Enable health check endpoint |
| `HEALTH_CHECK_INTERVAL` | number | `30000` | Health check interval (ms) |

### 🚀 Deployment Detection

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RENDER` | boolean | `false` | Automatically set by Render platform |
| `DEPLOYMENT_PLATFORM` | string | `undefined` | Manual platform identifier |

## 📝 Render Dashboard Configuration

When creating your Web Service on Render, add these environment variables:

### Required Variables:
```bash
NODE_ENV=production
PORT=10000
NODE_VERSION=20.11.0
LOG_LEVEL=info
```

### Optional Customization:
```bash
SERVER_NAME=my-audio-sfu
MEDIASOUP_MIN_PORT=20000
MEDIASOUP_MAX_PORT=20100
ALLOWED_ORIGINS=https://my-app.com,https://www.my-app.com
ENABLE_CORS=true
HEALTH_CHECK_ENABLED=true
```

## 🔍 Environment Variable Usage in Code

### Server Configuration:
```javascript
const PORT = process.env.PORT || 3001;
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const SERVER_NAME = process.env.SERVER_NAME || 'gyandhara-audio-sfu';
```

### mediasoup Configuration:
```javascript
const MEDIASOUP_CONFIG = {
  minPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 20000,
  maxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 20100,
  announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || 'auto'
};
```

### CORS Configuration:
```javascript
const corsEnabled = process.env.ENABLE_CORS !== 'false';
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [];
```

## 🛠️ Development vs Production

### Development Environment:
- `NODE_ENV=development`
- `LOG_LEVEL=debug`
- Additional local origins enabled
- File logging enabled
- Detailed error messages

### Production Environment:
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- JSON structured logging
- Security headers enabled
- Performance optimizations

## 🔒 Security Notes

1. **Never commit sensitive values** to git repository
2. **Use Render's Environment Variables** section for all configuration
3. **CORS origins** should be specific to your domains
4. **Log level** should be `info` or `warn` in production
5. **mediasoup ports** should be within Render's allowed range

## 📊 Monitoring and Debugging

### Log Level Guide:
- `error`: Only errors and critical issues
- `warn`: Warnings and errors
- `info`: General information, warnings, and errors (recommended)
- `debug`: Detailed debugging information (development only)

### Health Check Endpoints:
- `/health` - Basic health check
- `/api/info` - Server information (development only)
- `/stats` - Performance statistics (development only)

## 🚨 Troubleshooting

### Common Issues:

1. **Port already in use**: Render automatically assigns PORT
2. **CORS errors**: Check ALLOWED_ORIGINS configuration
3. **mediasoup fails**: Ensure Node.js 20+ and correct port range
4. **Build failures**: Verify NPM_CONFIG_PRODUCTION=false

### Debug Commands:
```bash
# Check environment variables
node -e "console.log(process.env)"

# Test health endpoint
curl https://your-service.onrender.com/health

# View server logs
# Use Render dashboard logs section
```