# 🚀 Gyandhara Educational Platform - Deployment Guide

## 📋 Pre-Deployment Checklist

### ✅ Environment Setup
- [x] MongoDB Atlas configured with connection string
- [x] Production environment variables set
- [x] Security configurations updated
- [x] CORS origins configured for production
- [x] Build optimizations implemented

### 🔐 Security Requirements
- [ ] Update JWT_SECRET in production environment
- [ ] Configure proper HTTPS certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Update admin credentials

## 🌟 Deployment Options

### Option 1: Vercel Deployment (Recommended for Frontend)

#### Step 1: Prepare for Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Build the project
npm run build
```

#### Step 2: Configure Vercel
Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ],
  "env": {
    "MONGODB_URI": "@mongodb-uri",
    "JWT_SECRET": "@jwt-secret",
    "NODE_ENV": "production"
  }
}
```

#### Step 3: Deploy
```bash
# Deploy to production
npm run deploy:vercel
# OR
vercel --prod
```

### Option 2: Heroku Deployment

#### Step 1: Install Heroku CLI
```bash
# Install Heroku CLI (Windows)
# Download from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login
```

#### Step 2: Create Heroku App
```bash
# Create new Heroku app
heroku create gyandhara-platform

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://satyam_ai:satyamtiwari01@gyandhara.ordgmuf.mongodb.net/gyaandhara?retryWrites=true&w=majority&appName=GYANDHARA"
heroku config:set JWT_SECRET="your-super-secure-production-jwt-key"
heroku config:set FRONTEND_URL="https://gyandhara-platform.herokuapp.com"
```

#### Step 3: Create Procfile
```
web: npm run prod:start
```

#### Step 4: Deploy
```bash
# Add and commit files
git add .
git commit -m "Deploy to Heroku"

# Deploy to Heroku
git push heroku main
# OR
npm run deploy:heroku
```

### Option 3: Netlify Deployment

#### Step 1: Build Configuration
Create `netlify.toml`:
```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_ENV = "production"

[[redirects]]
  from = "/api/*"
  to = "https://your-backend-url.com/api/:splat"
  status = 200
  force = true

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
```

#### Step 2: Deploy
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
npm run deploy:netlify
```

### Option 4: VPS/Dedicated Server with PM2

#### Step 1: Server Setup
```bash
# Update server
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install nginx -y
```

#### Step 2: Clone and Setup
```bash
# Clone repository
git clone https://github.com/satyam16-ai/voiceboard-educational-platform.git
cd voiceboard-educational-platform

# Install dependencies
npm install

# Copy production environment
cp .env.production .env

# Build the application
npm run build
```

#### Step 3: Configure PM2
```bash
# Start with PM2
npm run deploy:pm2

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

#### Step 4: Configure Nginx (Optional)
Create `/etc/nginx/sites-available/gyandhara`:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/gyandhara /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Option 5: Docker Deployment

#### Step 1: Build Docker Image
```bash
# Build the Docker image
docker build -t gyandhara-platform .

# Or use docker-compose
docker-compose up --build -d
```

#### Step 2: Run Container
```bash
# Run the container
docker run -d \
  --name gyandhara-app \
  -p 3000:3000 \
  -p 8080:8080 \
  -e NODE_ENV=production \
  -e MONGODB_URI="mongodb+srv://satyam_ai:satyamtiwari01@gyandhara.ordgmuf.mongodb.net/gyaandhara?retryWrites=true&w=majority&appName=GYANDHARA" \
  -e JWT_SECRET="your-super-secure-production-jwt-key" \
  gyandhara-platform
```

## 🔧 Environment Variables

### Required Production Variables
```bash
# Database
MONGODB_URI=mongodb+srv://satyam_ai:satyamtiwari01@gyandhara.ordgmuf.mongodb.net/gyaandhara?retryWrites=true&w=majority&appName=GYANDHARA

# Security
JWT_SECRET=your-super-secure-production-jwt-key-change-this-now
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your-production-session-secret-key

# Server
NODE_ENV=production
PORT=8080
FRONTEND_URL=https://your-domain.com

# Email (Optional)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_FROM_EMAIL=noreply@yourdomain.com

# AI Services (Optional)
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key
```

## 🔒 Security Considerations

### 1. Database Security
- ✅ Use MongoDB Atlas with IP whitelisting
- ✅ Enable authentication and authorization
- ✅ Use strong database passwords
- ✅ Regular security updates

### 2. Application Security
- ✅ Update JWT secrets for production
- ✅ Enable HTTPS/SSL certificates
- ✅ Configure proper CORS origins
- ✅ Enable rate limiting
- ✅ Use security headers (Helmet)

### 3. Server Security
- ✅ Keep server updated
- ✅ Configure firewall rules
- ✅ Use non-root users
- ✅ Regular security audits

## 📊 Performance Optimization

### 1. Frontend Optimizations
- ✅ Next.js optimization enabled
- ✅ Image optimization configured
- ✅ Code splitting implemented
- ✅ Bundle size optimization

### 2. Backend Optimizations
- ✅ Database connection pooling
- ✅ Compression middleware
- ✅ Caching strategies
- ✅ Rate limiting

### 3. Infrastructure Optimizations
- ✅ CDN integration (recommended)
- ✅ Load balancing (for high traffic)
- ✅ Database indexing
- ✅ Monitoring and logging

## 📱 Post-Deployment Testing

### 1. Functionality Tests
```bash
# Health check
curl https://your-domain.com/api/health

# Admin login test
curl -X POST https://your-domain.com/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# User creation test
# Test all major workflows
```

### 2. Performance Tests
- Load testing with Apache Bench or Artillery
- Database performance monitoring
- Memory and CPU usage monitoring
- Network latency testing

### 3. Security Tests
- SSL certificate validation
- CORS policy testing
- Authentication flow testing
- Authorization checks

## 🔧 Maintenance Commands

### PM2 Management
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart applications
pm2 restart all

# Update application
git pull
npm install
npm run build
pm2 restart all
```

### Docker Management
```bash
# View running containers
docker ps

# View logs
docker logs gyandhara-app

# Update application
docker-compose pull
docker-compose up --build -d
```

## 🆘 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Check network connectivity

#### 2. CORS Errors
- Update allowed origins in server configuration
- Check frontend URL configuration
- Verify credentials flag

#### 3. Build Failures
- Check Node.js version (18+)
- Clear cache: `npm run clean:all && npm install`
- Check TypeScript errors

#### 4. Performance Issues
- Monitor database queries
- Check memory usage
- Optimize bundle size
- Enable compression

### Debug Commands
```bash
# Check application logs
pm2 logs gyandhara-backend
pm2 logs gyandhara-frontend

# Monitor system resources
htop
iostat

# Test database connection
node -e "require('./server/database').connectDB().then(() => console.log('DB Connected')).catch(console.error)"
```

## 📞 Support

For deployment issues:
1. Check logs first
2. Review environment variables
3. Test individual components
4. Contact support team

---

**Important Notes:**
- Always test in staging environment first
- Keep backups of database and configuration
- Monitor application performance post-deployment
- Regular security updates and patches
- Use HTTPS in production
- Configure proper error handling and logging

**Success Criteria:**
- ✅ Application accessible via HTTPS
- ✅ All API endpoints working
- ✅ Real-time features functional
- ✅ Database operations successful
- ✅ Security headers properly configured
- ✅ Performance within acceptable limits