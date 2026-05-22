import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import nodemailer from 'nodemailer'

/**
 * MFA Module for EduHub
 * Handles Email OTP, SMS OTP, and TOTP generation/verification
 */

// Configure email transporter (update with your email service)
const emailTransporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  }
})

/**
 * Generate a 6-digit OTP code
 */
export function generateOTPCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Generate TOTP secret for Google Authenticator
 */
export function generateTOTPSecret(email, appName = 'EduHub') {
  return speakeasy.generateSecret({
    name: `${appName} (${email})`,
    issuer: appName,
    length: 32
  })
}

/**
 * Generate QR code for TOTP setup
 */
export async function generateQRCode(secret) {
  try {
    return await QRCode.toDataURL(secret.otpauth_url)
  } catch (err) {
    console.error('QR Code generation error:', err)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Verify TOTP token
 */
export function verifyTOTPToken(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 30 seconds window before/after
  })
}

/**
 * Generate backup codes for account recovery
 */
export function generateBackupCodes(count = 10) {
  const codes = []
  for (let i = 0; i < count; i++) {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()
    codes.push(code)
  }
  return codes
}

/**
 * Send OTP via email
 */
export async function sendEmailOTP(email, otp, dbQuery) {
  try {
    // Store OTP in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes validity
    await dbQuery(
      'INSERT INTO mfa_codes (user_id, code, code_type, expires_at) SELECT id, ?, ?, ? FROM users WHERE email = ?',
      [otp, 'email', expiresAt, email]
    )

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@eduhub.com',
      to: email,
      subject: 'EduHub - Your OTP for Login',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #333; text-align: center;">EduHub Login Verification</h2>
          <p style="color: #666; font-size: 16px;">Hi,</p>
          <p style="color: #666; font-size: 16px;">Your one-time password (OTP) for logging into EduHub is:</p>
          <div style="background-color: #f0f0f0; padding: 15px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 0;">${otp}</p>
          </div>
          <p style="color: #666; font-size: 14px;">This OTP is valid for 10 minutes only. Do not share it with anyone.</p>
          <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
            If you did not request this OTP, please ignore this email or contact our support team.
          </p>
        </div>
      `
    }

    await emailTransporter.sendMail(mailOptions)
    return { success: true, message: 'OTP sent to email' }
  } catch (err) {
    console.error('Email OTP sending error:', err)
    throw new Error('Failed to send OTP')
  }
}

/**
 * Send OTP via SMS (using Twilio)
 */
export async function sendSMSOTP(phoneNumber, otp, dbQuery, user_id) {
  try {
    const twilio = await import('twilio').then(m => m.default)
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )

    // Store OTP in database
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes validity
    await dbQuery(
      'INSERT INTO mfa_codes (user_id, code, code_type, expires_at) VALUES (?, ?, ?, ?)',
      [user_id, otp, 'sms', expiresAt]
    )

    // Send SMS
    await client.messages.create({
      body: `Your EduHub login OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    })

    return { success: true, message: 'OTP sent via SMS' }
  } catch (err) {
    console.error('SMS OTP sending error:', err)
    throw new Error('Failed to send OTP via SMS')
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTPCode(user_id, otp, dbQuery) {
  try {
    // Find the OTP in database
    const codes = await dbQuery(
      'SELECT * FROM mfa_codes WHERE user_id = ? AND code = ? AND is_used = 0 AND (expires_at > NOW() OR expires_at IS NULL) ORDER BY created_at DESC LIMIT 1',
      [user_id, otp]
    )

    if (codes.length === 0) {
      return { success: false, message: 'Invalid or expired OTP' }
    }

    // Mark code as used
    await dbQuery(
      'UPDATE mfa_codes SET is_used = 1 WHERE id = ?',
      [codes[0].id]
    )

    return { success: true, message: 'OTP verified successfully' }
  } catch (err) {
    console.error('OTP verification error:', err)
    throw new Error('Failed to verify OTP')
  }
}

/**
 * Get MFA settings for a user
 */
export async function getMFASettings(user_id, dbQuery) {
  try {
    const settings = await dbQuery(
      'SELECT * FROM mfa_settings WHERE user_id = ? LIMIT 1',
      [user_id]
    )

    if (settings.length === 0) {
      // Create default settings if not exist
      await dbQuery(
        'INSERT INTO mfa_settings (user_id, mfa_enabled) VALUES (?, 0)',
        [user_id]
      )
      return {
        user_id,
        mfa_enabled: false,
        email_mfa_enabled: false,
        sms_mfa_enabled: false,
        totp_mfa_enabled: false,
        totp_secret: null,
        phone_number: null
      }
    }

    // Remove sensitive data from response
    const setting = settings[0]
    return {
      user_id: setting.user_id,
      mfa_enabled: setting.mfa_enabled,
      email_mfa_enabled: setting.email_mfa_enabled,
      sms_mfa_enabled: setting.sms_mfa_enabled,
      totp_mfa_enabled: setting.totp_mfa_enabled,
      phone_number: setting.phone_number ? setting.phone_number.slice(0, -4) + '****' : null // Hide last 4 digits
    }
  } catch (err) {
    console.error('Get MFA settings error:', err)
    throw new Error('Failed to get MFA settings')
  }
}

/**
 * Update MFA settings
 */
export async function updateMFASettings(user_id, updates, dbQuery) {
  try {
    const allowedFields = [
      'mfa_enabled',
      'email_mfa_enabled',
      'sms_mfa_enabled',
      'totp_mfa_enabled',
      'totp_secret',
      'backup_codes',
      'phone_number'
    ]

    const updateFields = []
    const updateValues = []

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`)
        updateValues.push(value)
      }
    }

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update')
    }

    updateValues.push(user_id)

    await dbQuery(
      `UPDATE mfa_settings SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    )

    return { success: true, message: 'MFA settings updated' }
  } catch (err) {
    console.error('Update MFA settings error:', err)
    throw new Error('Failed to update MFA settings')
  }
}

/**
 * Disable all MFA methods for user
 */
export async function disableAllMFA(user_id, dbQuery) {
  try {
    await dbQuery(
      'UPDATE mfa_settings SET mfa_enabled = 0, email_mfa_enabled = 0, sms_mfa_enabled = 0, totp_mfa_enabled = 0, totp_secret = NULL, backup_codes = NULL, phone_number = NULL WHERE user_id = ?',
      [user_id]
    )

    return { success: true, message: 'All MFA methods disabled' }
  } catch (err) {
    console.error('Disable MFA error:', err)
    throw new Error('Failed to disable MFA')
  }
}

/**
 * Verify backup code and mark as used
 */
export async function verifyBackupCode(user_id, code, dbQuery) {
  try {
    const result = await dbQuery(
      'SELECT backup_codes FROM mfa_settings WHERE user_id = ?',
      [user_id]
    )

    if (result.length === 0) {
      return { success: false, message: 'No MFA settings found' }
    }

    const backupCodes = JSON.parse(result[0].backup_codes || '[]')
    const codeIndex = backupCodes.indexOf(code)

    if (codeIndex === -1) {
      return { success: false, message: 'Invalid backup code' }
    }

    // Remove used code
    backupCodes.splice(codeIndex, 1)

    // Update backup codes
    await dbQuery(
      'UPDATE mfa_settings SET backup_codes = ? WHERE user_id = ?',
      [JSON.stringify(backupCodes), user_id]
    )

    return { success: true, message: 'Backup code verified' }
  } catch (err) {
    console.error('Backup code verification error:', err)
    throw new Error('Failed to verify backup code')
  }
}
