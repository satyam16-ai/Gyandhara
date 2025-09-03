const nodemailer = require('nodemailer')
const twilio = require('twilio')
const crypto = require('crypto')
const config = require('../config')

// Twilio client (optional for development)
let twilioClient = null
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
    process.env.TWILIO_AUTH_TOKEN.length > 0) {
  try {
    twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    console.log('✅ Twilio client initialized successfully')
  } catch (error) {
    console.log('❌ Twilio initialization failed:', error.message)
  }
} else {
  console.log('⚠️  Twilio credentials not configured - SMS OTP disabled')
}

// Email transporter configuration
let emailTransporter = null

// Check if email credentials are configured
if (process.env.EMAIL_USER && 
    process.env.EMAIL_PASS && 
    process.env.EMAIL_USER.length > 0 &&
    process.env.EMAIL_PASS.length > 0) {
  try {
    emailTransporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
    console.log('✅ Email transporter initialized successfully')
  } catch (error) {
    console.log('❌ Email initialization failed:', error.message)
  }
} else {
  console.log('⚠️  Email credentials not configured - Email notifications disabled')
}

class OTPService {
  
  // Generate secure OTP
  static generateOTP(length = 6) {
    const digits = '0123456789'
    let otp = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, digits.length)
      otp += digits[randomIndex]
    }
    
    return otp
  }

  // Generate secure alphanumeric code for admin reset
  static generateSecureCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, chars.length)
      code += chars[randomIndex]
    }
    
    return code
  }

  // Send OTP via Email
  static async sendEmailOTP(email, otp, purpose = 'verification') {
    try {
      if (!emailTransporter) {
        console.log(`📧 Email OTP (Development Mode) for ${email}:`)
        console.log(`OTP: ${otp}`)
        console.log(`Purpose: ${purpose}`)
        return {
          success: true,
          messageId: 'dev-mode-' + Date.now(),
          method: 'email-dev'
        }
      }

      const htmlTemplate = this.getEmailTemplate(otp, purpose)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'VoiceBoard <noreply@voiceboard.edu>',
        to: email,
        subject: `VoiceBoard - Your ${purpose} Code: ${otp}`,
        html: htmlTemplate,
        text: `Your VoiceBoard ${purpose} code is: ${otp}. This code expires in 5 minutes.`
      }

      const info = await emailTransporter.sendMail(mailOptions)
      console.log(`📧 Email OTP sent to ${email}:`, info.messageId)
      
      return {
        success: true,
        messageId: info.messageId,
        method: 'email'
      }
    } catch (error) {
      console.error('❌ Email OTP send failed:', error.message)
      throw new Error('Failed to send email OTP: ' + error.message)
    }
  }

  // Send SMS OTP via Twilio
  static async sendSMSOTP(phone, otp) {
    try {
      if (!twilioClient) {
        console.log(`🔔 SMS OTP (Development Mode): ${otp} for ${phone}`)
        return { success: true, message: 'OTP logged to console (dev mode)' }
      }

      const message = await twilioClient.messages.create({
        body: `VoiceBoard Admin: Your OTP is ${otp}. Valid for 10 minutes. Do not share.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      })

      return { 
        success: true, 
        message: 'SMS sent successfully',
        sid: message.sid 
      }
    } catch (error) {
      console.error('SMS sending error:', error)
      return { success: false, error: error.message }
    }
  }

  // Send login credentials via SMS
  static async sendCredentialsSMS(phone, userData) {
    try {
      const { name, username, tempPassword, loginUrl } = userData
      
      if (!twilioClient) {
        console.log(`📱 SMS Credentials (Development Mode) for ${phone}:`)
        console.log(`Name: ${name}`)
        console.log(`Username: ${username}`)
        console.log(`Password: ${tempPassword}`)
        console.log(`Login: ${loginUrl}`)
        return { success: true, message: 'Credentials logged to console (dev mode)' }
      }

      const message = await twilioClient.messages.create({
        body: `Welcome to VoiceBoard, ${name}! Your login details:
Username: ${username}
Password: ${tempPassword}
Login: ${loginUrl}

Please change your password after first login. Do not share these credentials.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      })

      return { 
        success: true, 
        message: 'Credentials SMS sent successfully',
        sid: message.sid 
      }
    } catch (error) {
      console.error('❌ Credentials SMS sending error:', error)
      
      // Handle Twilio trial account limitations gracefully
      if (error.code === 21608) {
        console.log(`📱 [TRIAL ACCOUNT] SMS Credentials for ${phone}:`)
        console.log(`Name: ${name}`)
        console.log(`Username: ${username}`)
        console.log(`Password: ${tempPassword}`)
        console.log(`Login: ${loginUrl}`)
        console.log(`⚠️  To send SMS to this number, verify it at: https://twilio.com/user/account/phone-numbers/verified`)
        
        return { 
          success: true, 
          message: 'Credentials logged (Trial account - number needs verification)',
          trialAccountLimitation: true,
          verificationUrl: 'https://twilio.com/user/account/phone-numbers/verified'
        }
      }
      
      // For other errors, fall back to console logging
      console.log(`📱 [FALLBACK] SMS Credentials for ${phone}:`)
      console.log(`Name: ${name}`)
      console.log(`Username: ${username}`)
      console.log(`Password: ${tempPassword}`)
      console.log(`Login: ${loginUrl}`)
      
      return { 
        success: true, 
        message: 'Credentials logged (SMS service unavailable)',
        fallback: true
      }
    }
  }

  // Send password reset credentials via SMS
  static async sendPasswordResetSMS(phone, userData) {
    try {
      const { name, username, tempPassword, loginUrl } = userData
      
      if (!twilioClient) {
        console.log(`📱 SMS Password Reset (Development Mode) for ${phone}:`)
        console.log(`Name: ${name}`)
        console.log(`Username: ${username}`)
        console.log(`New Password: ${tempPassword}`)
        console.log(`Login: ${loginUrl}`)
        return { success: true, message: 'Password reset logged to console (dev mode)' }
      }

      const message = await twilioClient.messages.create({
        body: `VoiceBoard Password Reset for ${name}:
Username: ${username}
New Password: ${tempPassword}
Login: ${loginUrl}

Your password has been reset by an administrator. Please login and change your password immediately.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      })

      return { 
        success: true, 
        message: 'Password reset SMS sent successfully',
        sid: message.sid 
      }
    } catch (error) {
      console.error('❌ Password reset SMS sending error:', error)
      
      // Handle Twilio trial account limitations gracefully
      if (error.code === 21608) {
        console.log(`📱 [TRIAL ACCOUNT] SMS Password Reset for ${phone}:`)
        console.log(`Name: ${name}`)
        console.log(`Username: ${username}`)
        console.log(`New Password: ${tempPassword}`)
        console.log(`Login: ${loginUrl}`)
        console.log(`⚠️  To send SMS to this number, verify it at: https://twilio.com/user/account/phone-numbers/verified`)
        
        return { 
          success: true, 
          message: 'Password reset logged (Trial account - number needs verification)',
          trialAccountLimitation: true,
          verificationUrl: 'https://twilio.com/user/account/phone-numbers/verified'
        }
      }
      
      // For other errors, fall back to console logging
      console.log(`📱 [FALLBACK] SMS Password Reset for ${phone}:`)
      console.log(`Name: ${name}`)
      console.log(`Username: ${username}`)
      console.log(`New Password: ${tempPassword}`)
      console.log(`Login: ${loginUrl}`)
      
      return { 
        success: true, 
        message: 'Password reset logged (SMS service unavailable)',
        fallback: true
      }
    }
  }

  // Send OTP via both email and SMS
  static async sendDualOTP(email, phoneNumber, otp, purpose = 'verification') {
    const results = {
      email: null,
      sms: null,
      success: false
    }

    try {
      // Send email OTP
      if (email) {
        try {
          results.email = await this.sendEmailOTP(email, otp, purpose)
        } catch (error) {
          results.email = { success: false, error: error.message }
        }
      }

      // Send SMS OTP
      if (phoneNumber) {
        try {
          results.sms = await this.sendSMSOTP(phoneNumber, otp, purpose)
        } catch (error) {
          results.sms = { success: false, error: error.message }
        }
      }

      // Consider success if at least one method worked
      results.success = (results.email?.success || results.sms?.success)

      return results
    } catch (error) {
      console.error('❌ Dual OTP send failed:', error.message)
      throw error
    }
  }

  // Send admin password reset with temporary credentials
  static async sendAdminReset(email, tempPassword, adminName) {
    try {
      if (!emailTransporter) {
        console.log(`📧 Admin Reset (Development Mode) for ${email}:`)
        console.log(`Admin: ${adminName}`)
        console.log(`Temp Password: ${tempPassword}`)
        return {
          success: true,
          messageId: 'dev-mode-admin-reset-' + Date.now()
        }
      }

      const htmlTemplate = this.getAdminResetTemplate(tempPassword, adminName)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'VoiceBoard Security <security@voiceboard.edu>',
        to: email,
        subject: 'VoiceBoard Admin - Temporary Password Reset',
        html: htmlTemplate,
        text: `Your temporary VoiceBoard admin password is: ${tempPassword}. Please change it immediately after login.`
      }

      const info = await emailTransporter.sendMail(mailOptions)
      console.log(`🔐 Admin reset sent to ${email}:`, info.messageId)
      
      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      console.error('❌ Admin reset send failed:', error.message)
      throw new Error('Failed to send admin reset: ' + error.message)
    }
  }

  // Send welcome email for new users
  static async sendWelcomeEmail(email, userData) {
    try {
      if (!emailTransporter) {
        console.log(`📧 Welcome Email (Development Mode) for ${email}:`)
        console.log(`Name: ${userData.name}`)
        console.log(`Username: ${userData.username}`)
        console.log(`Password: ${userData.tempPassword}`)
        console.log(`Role: ${userData.role}`)
        console.log(`Login URL: ${userData.loginUrl}`)
        return {
          success: true,
          messageId: 'dev-mode-welcome-' + Date.now()
        }
      }

      const htmlTemplate = this.getWelcomeTemplate(userData)
      
      const mailOptions = {
        from: process.env.EMAIL_FROM || 'VoiceBoard <welcome@voiceboard.edu>',
        to: email,
        subject: `Welcome to VoiceBoard - Your ${userData.role} Account`,
        html: htmlTemplate,
        text: `Welcome to VoiceBoard! Your login: ${userData.username}, Temporary password: ${userData.tempPassword}. Login at: ${userData.loginUrl}`
      }

      const info = await emailTransporter.sendMail(mailOptions)
      console.log(`📧 Welcome email sent to ${email}:`, info.messageId)
      
      return {
        success: true,
        messageId: info.messageId
      }
    } catch (error) {
      console.error('❌ Welcome email send failed:', error.message)
      throw new Error('Failed to send welcome email: ' + error.message)
    }
  }

  // Email template for OTP
  static getEmailTemplate(otp, purpose) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .otp-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .otp-code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1d4ed8; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎓 VoiceBoard</div>
                <h2>Your ${purpose.charAt(0).toUpperCase() + purpose.slice(1)} Code</h2>
            </div>
            
            <div class="otp-box">
                <div class="otp-code">${otp}</div>
                <p>Enter this code to continue</p>
            </div>
            
            <p>This code will expire in <strong>5 minutes</strong> for your security.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            
            <div class="footer">
                <p>VoiceBoard - AI-Powered Learning Platform for Rural Students</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  // Email template for admin reset
  static getAdminResetTemplate(tempPassword, adminName) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; background: #dc2626; color: white; padding: 20px; border-radius: 8px; }
            .password-box { background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .temp-password { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #dc2626; font-family: monospace; }
            .warning { background: #fbbf24; color: #92400e; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🔐 VoiceBoard Admin Security</h2>
                <p>Password Reset Request</p>
            </div>
            
            <p>Hello ${adminName},</p>
            <p>Your VoiceBoard admin password has been reset. Here is your temporary password:</p>
            
            <div class="password-box">
                <div class="temp-password">${tempPassword}</div>
            </div>
            
            <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <ul>
                    <li>This is a temporary password</li>
                    <li>Change it immediately after login</li>
                    <li>Do not share this password with anyone</li>
                    <li>If you didn't request this reset, contact IT immediately</li>
                </ul>
            </div>
            
            <p>Login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin-login">Admin Panel</a></p>
            
            <div class="footer">
                <p>VoiceBoard Security Team</p>
                <p>This message was sent automatically. Do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  // Email template for welcome message
  static getWelcomeTemplate(userData) {
    const { name, username, tempPassword, role, loginUrl } = userData
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #3b82f6, #22c55e); color: white; padding: 30px; border-radius: 8px; }
            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .credentials-box { background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .credential-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
            .credential-label { font-weight: bold; color: #374151; }
            .credential-value { font-family: monospace; color: #1d4ed8; }
            .role-badge { display: inline-block; background: #22c55e; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; margin: 10px 0; }
            .login-button { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: bold; margin: 20px 0; }
            .tips { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🎓 VoiceBoard</div>
                <h2>Welcome to VoiceBoard!</h2>
                <p>Your account has been created successfully</p>
            </div>
            
            <p>Hello <strong>${name}</strong>,</p>
            <p>Welcome to VoiceBoard, the AI-powered learning platform! Your account has been created with the following details:</p>
            
            <div class="role-badge">${role.toUpperCase()}</div>
            
            <div class="credentials-box">
                <h3 style="margin-top: 0; color: #1f2937;">Login Credentials</h3>
                <div class="credential-row">
                    <span class="credential-label">Username:</span>
                    <span class="credential-value">${username}</span>
                </div>
                <div class="credential-row">
                    <span class="credential-label">Temporary Password:</span>
                    <span class="credential-value">${tempPassword}</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="${loginUrl}" class="login-button">Login to VoiceBoard</a>
            </div>
            
            <div class="tips">
                <h4 style="margin-top: 0;">🔐 Important Security Steps:</h4>
                <ul>
                    <li><strong>Change your password</strong> immediately after first login</li>
                    <li><strong>Keep your credentials secure</strong> and don't share them</li>
                    <li><strong>Use a strong password</strong> with uppercase, lowercase, numbers, and symbols</li>
                    <li><strong>Contact support</strong> if you have any login issues</li>
                </ul>
            </div>
            
            ${role === 'teacher' ? `
            <div style="background: #ecfccb; border-left: 4px solid #65a30d; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0;">🎯 Getting Started as a Teacher:</h4>
                <ul>
                    <li>Create your first class session</li>
                    <li>Set up your teaching preferences</li>
                    <li>Test the whiteboard and audio features</li>
                    <li>Invite students to join your sessions</li>
                </ul>
            </div>
            ` : `
            <div style="background: #ecfccb; border-left: 4px solid #65a30d; padding: 15px; margin: 20px 0;">
                <h4 style="margin-top: 0;">📚 Getting Started as a Student:</h4>
                <ul>
                    <li>Join your first class session</li>
                    <li>Set up your bandwidth preferences</li>
                    <li>Test audio and interaction features</li>
                    <li>Explore AI-powered learning tools</li>
                </ul>
            </div>
            `}
            
            <p>If you have any questions or need assistance, please contact our support team.</p>
            
            <div class="footer">
                <p><strong>VoiceBoard Team</strong></p>
                <p>AI-Powered Learning Platform for Rural Students</p>
                <p>This is an automated message. Please do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  // Verify Twilio configuration
  static async verifyTwilioConfig() {
    try {
      const account = await twilioClient.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID).fetch()
      console.log('✅ Twilio configuration verified:', account.friendlyName)
      return true
    } catch (error) {
      console.error('❌ Twilio configuration error:', error.message)
      return false
    }
  }

  // Verify email configuration
  static async verifyEmailConfig() {
    try {
      await emailTransporter.verify()
      console.log('✅ Email configuration verified')
      return true
    } catch (error) {
      console.error('❌ Email configuration error:', error.message)
      return false
    }
  }

  // Test OTP sending (for development)
  static async testOTPDelivery(email, phoneNumber) {
    const testOTP = this.generateOTP()
    console.log('🧪 Testing OTP delivery with code:', testOTP)
    
    try {
      const result = await this.sendDualOTP(email, phoneNumber, testOTP, 'test')
      console.log('📊 Test results:', result)
      return result
    } catch (error) {
      console.error('❌ OTP test failed:', error)
      throw error
    }
  }
}

module.exports = OTPService
