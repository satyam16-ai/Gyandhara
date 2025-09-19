# 🌐 Production Server Configuration

## 🚀 Deployed Services

### **Frontend Application**
- **URL**: https://gyandhara-tau.vercel.app
- **Platform**: Vercel
- **Purpose**: React frontend application

### **Backend API Server**
- **URL**: https://gyandhara-backend.onrender.com
- **Platform**: Render
- **Purpose**: Authentication, user management, general API endpoints

### **WebRTC Audio Server**
- **URL**: https://webrtc-server-sih.onrender.com
- **Platform**: Render
- **Purpose**: Real-time audio streaming with mediasoup SFU

## 🔗 Server Interconnections

```
Frontend (Vercel)
├── API Calls → Backend Server (Render)
│   ├── /api/auth/login
│   ├── /api/auth/register
│   ├── /api/users/*
│   └── /api/classes/*
│
└── WebRTC Connection → Audio Server (Render)
    ├── Socket.IO connection
    ├── WebRTC signaling
    └── Audio streaming
```

## ⚙️ CORS Configuration

All servers are configured to accept requests from:
- ✅ `https://gyandhara-tau.vercel.app` (Frontend)
- ✅ `https://gyandhara-backend.onrender.com` (Backend API)
- ✅ `https://webrtc-server-sih.onrender.com` (WebRTC Server)
- ✅ `http://localhost:3000` (Development)
- ✅ `http://localhost:5173` (Vite dev server)

## 🔧 Environment Variables for WebRTC Server

```env
NODE_ENV=production
PORT=10000
NODE_VERSION=20.11.0
LOG_LEVEL=info
SERVER_NAME=webrtc-server-sih
NPM_CONFIG_PRODUCTION=false
NPM_CONFIG_CACHE=/tmp/.npm
MEDIASOUP_MIN_PORT=20000
MEDIASOUP_MAX_PORT=20100
MEDIASOUP_ANNOUNCED_IP=auto
ENABLE_CORS=true
ALLOWED_ORIGINS=https://gyandhara-tau.vercel.app,https://gyandhara-backend.onrender.com,https://webrtc-server-sih.onrender.com,http://localhost:3000,http://localhost:5173
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=30000
DEPLOYMENT_PLATFORM=render
```

## 🩺 Health Check Endpoints

### **WebRTC Server**
- **Health**: https://webrtc-server-sih.onrender.com/health
- **API Info**: https://webrtc-server-sih.onrender.com/api/info
- **Stats**: https://webrtc-server-sih.onrender.com/stats

### **Backend Server**
- **Health**: https://gyandhara-backend.onrender.com/health (if implemented)
- **API Status**: https://gyandhara-backend.onrender.com/api/status (if implemented)

## 🚨 Troubleshooting Login Issue

**Current Error**: `POST https://gyandhara-tau.vercel.app/api/auth/login 500`

**Problem**: Frontend is trying to call login API on itself instead of the backend server.

**Solution**: Update your frontend configuration to point to the correct backend:

### **Frontend Environment Variables** (Vercel)
```env
# For your React frontend
NEXT_PUBLIC_API_BASE_URL=https://gyandhara-backend.onrender.com
NEXT_PUBLIC_WEBRTC_SERVER_URL=https://webrtc-server-sih.onrender.com

# Or if using process.env
REACT_APP_API_BASE_URL=https://gyandhara-backend.onrender.com
REACT_APP_WEBRTC_SERVER_URL=https://webrtc-server-sih.onrender.com
```

### **Frontend API Configuration**
Update your API calls in the frontend:
```javascript
// Instead of:
const response = await fetch('/api/auth/login', {...})

// Use:
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {...})

// Or with a base URL configuration:
const API_BASE_URL = 'https://gyandhara-backend.onrender.com'
const response = await fetch(`${API_BASE_URL}/api/auth/login`, {...})
```

## 🔄 Next Steps

1. **Fix Frontend API Configuration**:
   - Update frontend to use `https://gyandhara-backend.onrender.com` for API calls
   - Add environment variables in Vercel dashboard

2. **Test Connections**:
   - Verify login works with backend server
   - Test WebRTC audio functionality

3. **Monitor Logs**:
   - Check Render logs for both servers
   - Verify CORS is working correctly

## 📱 Mobile/Cross-Origin Notes

- Both servers accept requests with no origin (mobile apps)
- CORS is configured for cross-origin requests
- WebSocket connections supported for real-time communication