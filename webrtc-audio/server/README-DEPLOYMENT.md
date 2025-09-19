# WebRTC Audio SFU Server - Render Deployment

## Overview
This is a production-ready WebRTC SFU (Selective Forwarding Unit) server for the Gyandhara educational platform. It handles real-time audio streaming between teachers and students in virtual classrooms.

## Render Deployment Instructions

### Method 1: Direct Deployment from GitHub

1. **Fork or Clone Repository**
   ```bash
   git clone https://github.com/satyam16-ai/Gyandhara-SIH-project.git
   cd Gyandhara-SIH-project/webrtc-audio/server
   ```

2. **Create New Web Service on Render**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository: `Gyandhara-SIH-project`

3. **Configure Service Settings**
   ```
   Name: gyandhara-audio-sfu
   Environment: Node
   Region: Oregon (or closest to your users)
   Branch: main (or your deployment branch)
   Root Directory: webrtc-audio/server
   ```

4. **Build & Deploy Commands**
   ```
   Build Command: npm install
   Start Command: npm start
   ```

5. **Environment Variables**
   Add these in Render dashboard:
   ```
   NODE_ENV=production
   PORT=10000
   LOG_LEVEL=info
   CORS_ORIGIN=https://yourdomain.com,https://yourapp.vercel.app
   ```

### Method 2: Using render.yaml (Infrastructure as Code)

1. **Place render.yaml in Repository Root**
   - The `render.yaml` file is already configured
   - Commit and push to your repository

2. **Deploy via Render Dashboard**
   - In Render dashboard, go to "YAML"
   - Connect repository and deploy

### Method 3: Docker Deployment

1. **Using the Dockerfile**
   ```bash
   docker build -t gyandhara-audio-sfu .
   docker run -p 10000:10000 gyandhara-audio-sfu
   ```

2. **Render Docker Service**
   - Create new "Web Service"
   - Choose "Deploy an existing image from a registry"
   - Build and push your Docker image to a registry

## Configuration

### Required Environment Variables
- `NODE_ENV`: Set to "production"
- `PORT`: Port number (default: 10000)
- `CORS_ORIGIN`: Comma-separated list of allowed origins

### Optional Environment Variables
- `LOG_LEVEL`: Logging level (info, debug, warn, error)
- `NUM_WORKERS`: Number of mediasoup workers (default: auto)
- `RTC_MIN_PORT`: Minimum RTC port (default: 10000)
- `RTC_MAX_PORT`: Maximum RTC port (default: 59999)

## Health Checks

The server provides several health check endpoints:

- `GET /health` - Basic health check
- `GET /ready` - Readiness probe
- `GET /stats` - Server statistics
- `GET /api/info` - API information

## Production Features

✅ **Security**
- Helmet.js for security headers
- CORS configured for production domains
- Input validation and sanitization
- Trust proxy configuration for Render

✅ **Monitoring**
- Structured logging with Winston
- Health check endpoints
- Performance metrics
- Error tracking

✅ **Reliability**
- Graceful shutdown handling
- Process management
- Worker supervision
- Auto-restart on failures

✅ **Scalability**
- Multi-worker mediasoup setup
- Connection pooling
- Resource monitoring
- Auto-scaling ready

## Updating CORS Origins

To allow your frontend application to connect, update the `allowedOrigins` array in `server.js`:

```javascript
const allowedOrigins = [
  'https://your-frontend-domain.com',
  'https://your-app.vercel.app',
  // Add your production domains here
];
```

## Testing Deployment

1. **Health Check**
   ```bash
   curl https://your-render-app.onrender.com/health
   ```

2. **API Info**
   ```bash
   curl https://your-render-app.onrender.com/api/info
   ```

3. **WebSocket Connection**
   Test from your frontend application

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if service is running: `/health` endpoint
   - Verify CORS configuration
   - Check firewall settings

2. **WebRTC Not Working**
   - Ensure RTC ports are open (10000-59999)
   - Check NAT/firewall configuration
   - Verify STUN/TURN servers if needed

3. **High Memory Usage**
   - Monitor worker count
   - Check for memory leaks
   - Consider scaling plan upgrade

### Logs
Check logs in Render dashboard or use:
```bash
render logs --service gyandhara-audio-sfu
```

## Support

- GitHub Issues: [Create Issue](https://github.com/satyam16-ai/Gyandhara-SIH-project/issues)
- Documentation: See main README.md
- Contact: Gyandhara Development Team

## License
MIT License - See LICENSE file for details