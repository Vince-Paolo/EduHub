import backendApp from './functions/backend/app.js'
import express from 'express';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import './init-mfa-tables.js'

dotenv.config();

const app = backendApp;
app.use(express.json());

// 1. Configure Nodemailer with your Gmail OAuth2 credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_OAUTH_EMAIL,
    clientId: process.env.GMAIL_OAUTH_CLIENT_ID,
    clientSecret: process.env.GMAIL_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_OAUTH_REFRESH_TOKEN,
  },
});

// A temporary in-memory store for OTPs (For production, use Redis or a database)
const otpCache = new Map();

// 2. Endpoint to generate and send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP with an expiration time (e.g., 5 minutes)
  otpCache.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  // Email setup
  const mailOptions = {
    from: `Your App Security <${process.env.GMAIL_OAUTH_EMAIL}>`,
    to: email,
    subject: 'Your MFA Verification Code',
    text: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; max-width: 600px;">
        <h2 style="color: #333;">Security Verification</h2>
        <p style="font-size: 16px; color: #666;">Use the following multi-factor authentication code to complete your login:</p>
        <div style="font-size: 28px; font-weight: bold; background: #f5f7ff; padding: 15px; text-align: center; letter-spacing: 5px; color: #667eea; border-radius: 6px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #999;">If you didn't request this code, please ignore this email or secure your account.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully to your email.' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send OTP email.' });
  }
});

// 3. Endpoint to verify the OTP entered by the user
app.post('/api/verify-otp', (req, res) => {
  const { email, code } = req.body;
  const record = otpCache.get(email);

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested for this email.' });
  }

  if (Date.now() > record.expiresAt) {
    otpCache.delete(email);
    return res.status(400).json({ error: 'OTP has expired.' });
  }

  if (record.otp === code) {
    otpCache.delete(email); // Success! Clear the OTP
    return res.status(200).json({ success: true, message: 'MFA Verification successful!' });
  } else {
    return res.status(400).json({ error: 'Invalid verification code.' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✓ Server listening on port ${PORT}`)
  console.log(`✓ Groq API quiz generation enabled`)
  console.log(`✓ POST /api/generate-quiz ready for requests`)
  console.log(`✓ POST /api/sync  — offline sync queue endpoint ready`)
  console.log(`✓ GET  /api/sync/:userId — progress fetch ready\n`)
});
