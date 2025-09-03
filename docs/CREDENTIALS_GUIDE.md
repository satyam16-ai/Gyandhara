# 🔐 Gyaandhara Platform - Complete Credentials Guide

## ✅ Current Status

### 🎯 **WORKING COMPONENTS** (No credentials needed)
- ✅ **MongoDB Database** - Running locally on `mongodb://localhost:27017/gyaandhara`
- ✅ **Admin Panel Backend** - Running on `http://localhost:8080`
- ✅ **Next.js Frontend** - Running on `http://localhost:3007`  
- ✅ **Admin Authentication** - JWT-based with default admin account
- ✅ **WebSocket Real-time** - Canvas drawing and chat functionality
- ✅ **User Management** - CRUD operations for users
- ✅ **Password Reset** - Admin can reset user passwords

### 🔑 **DEFAULT ADMIN ACCESS**
```
URL: http://localhost:3007/admin-login
Username: admin
Password: admin123!
Email: admin@gyaandhara.com
```

---

## 📋 **CREDENTIALS CHECKLIST** 

### 🚨 **CRITICAL FOR PRODUCTION** 

#### 1. **JWT Security**
```env
JWT_SECRET=your_super_secure_random_string_here
JWT_EXPIRE=7d
```
**Current Status:** ⚠️ Using default secret  
**Priority:** 🔴 HIGH - Change immediately for production

#### 2. **MongoDB Security**
```env
MONGODB_URI=mongodb://username:password@host:port/database
```
**Current Status:** ✅ Working locally without auth  
**Priority:** 🔴 HIGH - Add authentication for production

---

### 📧 **EMAIL FUNCTIONALITY** 

#### 3. **SMTP Email Configuration** (Password reset emails, welcome emails)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Setup Instructions:**
- **Gmail:** Enable 2FA → Generate App Password
- **Outlook:** Use account password or app password
- **Custom SMTP:** Get credentials from your provider

**Current Status:** ⚠️ Not configured - email fallback in place  
**Priority:** 🟡 MEDIUM - Required for password resets

---

### 📱 **SMS FUNCTIONALITY**

#### 4. **Twilio SMS Configuration** (OTP verification, notifications)
```env
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcdef
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Setup Instructions:**
1. Create Twilio account at https://console.twilio.com/
2. Get Account SID & Auth Token from dashboard
3. Purchase a phone number for sending SMS

**Current Status:** ⚠️ Not configured - SMS disabled, console logging active  
**Priority:** 🟡 MEDIUM - Required for SMS OTP

---

### 🤖 **AI/ML FEATURES** 

#### 5. **OpenAI Integration** (Content generation, chat assistance)
```env
OPENAI_API_KEY=sk-1234567890abcdef1234567890abcdef1234567890abcdef
```

**Setup Instructions:**
1. Create OpenAI account at https://platform.openai.com/
2. Generate API key in API keys section
3. Add billing information for usage

**Current Status:** ⚠️ Not configured - AI features disabled  
**Priority:** 🟢 LOW - Optional feature enhancement

#### 6. **Google Translate API** (Multi-language support)
```env
GOOGLE_TRANSLATE_API_KEY=AIzaSy1234567890abcdef1234567890abcdef123
```

**Setup Instructions:**
1. Create Google Cloud project
2. Enable Cloud Translation API
3. Create API key with Translation API access

**Current Status:** ⚠️ Not configured - Translation disabled  
**Priority:** 🟢 LOW - Optional for international users

---

### 🔒 **ENHANCED SECURITY** 

#### 7. **Advanced Authentication** (Optional)
```env
# Rate limiting
REDIS_URL=redis://localhost:6379
ADMIN_LOGIN_ATTEMPTS=3
USER_LOGIN_ATTEMPTS=5

# Session security
SESSION_SECRET=another_secure_random_string
COOKIE_SECURE=true
```

**Current Status:** ✅ Basic rate limiting active  
**Priority:** 🟡 MEDIUM - Enhance for production

---

## 🚀 **QUICK START GUIDE**

### 1. **Immediate Development** (Current working state)
```bash
# Start MongoDB
sudo systemctl start mongod

# Start Gyaandhara
cd /home/satyam/Desktop/Projects/std
PORT=8080 node server/index.js &  # Backend
npm run dev                       # Frontend

# Access admin panel
# URL: http://localhost:3007/admin-login
# Username: admin | Password: admin123!
```

### 2. **Production Setup Priority**
1. 🔴 **Change JWT_SECRET** - Generate secure random string
2. 🔴 **Secure MongoDB** - Add authentication, use cloud service
3. 🟡 **Configure Email** - For password resets and notifications
4. 🟡 **Setup Twilio** - For SMS OTP functionality
5. 🟢 **Add AI Services** - For enhanced features

---

## 🔧 **ENVIRONMENT FILE TEMPLATE**

Create `/home/satyam/Desktop/Projects/std/.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/gyaandhara

# Server
PORT=8080
NODE_ENV=development

# Security (🔴 CHANGE FOR PRODUCTION)
JWT_SECRET=gyaandhara_jwt_secret_key_CHANGE_THIS
JWT_EXPIRE=7d

# Email (📧 Configure for password resets)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# SMS (📱 Configure for OTP)
# SMS (📱 Configure for OTP)
TWILIO_ACCOUNT_SID=YOUR_TWILIO_ACCOUNT_SID_HERE
TWILIO_AUTH_TOKEN=YOUR_TWILIO_AUTH_TOKEN_HERE
TWILIO_PHONE_NUMBER=YOUR_TWILIO_PHONE_NUMBER_HERE

# AI Services (🤖 Optional)
OPENAI_API_KEY=sk-your_openai_api_key
GOOGLE_TRANSLATE_API_KEY=AIzaSy_your_google_translate_key

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3007
```

---

## 📊 **FEATURE MATRIX**

| Feature | Status | Credentials Needed |
|---------|--------|-------------------|
| User Login/Logout | ✅ Working | None |
| Admin Panel | ✅ Working | JWT Secret |
| Password Management | ✅ Working | SMTP (for email) |
| SMS OTP | ⚠️ Console mode | Twilio |
| Email Notifications | ⚠️ Console mode | SMTP |
| Real-time Whiteboard | ✅ Working | None |
| Voice Communication | ✅ Working | None |
| User Management | ✅ Working | None |
| Session Recording | ✅ Working | None |
| AI Content Generation | ❌ Disabled | OpenAI API |
| Multi-language Support | ❌ Disabled | Google Translate |

---

## 🛡️ **SECURITY RECOMMENDATIONS**

### Development Environment
- ✅ Basic authentication working
- ✅ Rate limiting configured  
- ✅ Input validation in place
- ⚠️ Using default JWT secret

### Production Environment  
- 🔴 **Must change JWT_SECRET**
- 🔴 **Use HTTPS in production**
- 🔴 **Secure MongoDB with authentication**
- 🟡 **Configure proper SMTP for emails**
- 🟡 **Set up proper error logging**
- 🟡 **Use environment-specific configurations**

---

## 📞 **SUPPORT & TROUBLESHOOTING**

### Common Issues:
1. **Port conflicts** - Server automatically finds available ports
2. **MongoDB not running** - Start with `sudo systemctl start mongod`
3. **Email not sending** - Check SMTP credentials and firewall
4. **SMS not working** - Verify Twilio credentials and phone number format

### Current Working URLs:
- **Frontend:** http://localhost:3007
- **Backend:** http://localhost:8080  
- **Admin Panel:** http://localhost:3007/admin-login
- **API Docs:** http://localhost:8080/api/health (health check)

---

**🎓 Gyaandhara Platform - AI-Powered Learning for Rural Students**  
*Developed with Next.js, MongoDB, Socket.io, and comprehensive security features*
