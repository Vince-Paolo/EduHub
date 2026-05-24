import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import admin from 'firebase-admin'
import cookieParser from 'cookie-parser'
import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import syncRouter from '../api/sync.js'

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envCandidates = [
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '..', '.env.local'),
  path.resolve(__dirname, '..', '.env'),
  path.resolve(__dirname, '..', '..', '.env.local'),
  path.resolve(__dirname, '..', '..', '.env')
]

const envPaths = envCandidates.filter(fs.existsSync)
if (envPaths.length) {
  envPaths.forEach((path) => dotenv.config({ path, override: true }))
  console.log(`Loaded environment from ${envPaths.join(', ')}`)
  console.log(`Token value: ${process.env.VITE_GROQ_API_KEY ? 'SET' : 'NOT SET'}`)
} else {
  console.warn('No .env file found in local or parent directories.')
}

const authSocialRouter = (await import('../../routes/Auth.social.js')).default
const mfaService = await import('./mfa.js')

const hasFirebaseAdminConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
)

if (hasFirebaseAdminConfig) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  })
} else {
  admin.initializeApp()
}

const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret'

const dbPoolOptions = {
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
}

if (DB_PASSWORD) {
  dbPoolOptions.password = DB_PASSWORD
}

const dbPool = mysql.createPool(dbPoolOptions)

function normalizeUserRow(row) {
  if (!row) return null
  const id = row.id ?? row.user_id ?? row.uid ?? row.ID
  const email = row.email ?? row.email_address ?? row.user_email
  const username = row.username ?? row.user_name ?? row.name
  const fullName = row.full_name ?? row.fullName ?? row.name
  const createdAtRaw = row.created_at ?? row.createdAt ?? row.joinDate
  const createdAt = createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw
  return {
    id,
    uid: id,
    email,
    username,
    fullName,
    createdAt,
    password: row.password ?? row.pass ?? row.password_hash ?? row.pwd
  }
}

async function getUserById(id) {
  if (!id) return null
  const rows = await dbQuery('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return normalizeUserRow(rows[0])
}

async function getUserColumns() {
  const rows = await dbQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  )
  return rows.map(r => r.COLUMN_NAME)
}

function chooseColumn(columns, candidates) {
  return candidates.find((column) => columns.includes(column))
}

async function createUser({ fullName, username, email, password }) {
  const columns = await getUserColumns()
  const fieldNames = []
  const values = []
  const placeholders = []

  const addField = (field, value) => {
    fieldNames.push(field)
    values.push(value)
    placeholders.push('?')
  }

  const normalizedEmail = normalizeEmail(email)
  const normalizedUsername = normalizeString(username)
  const normalizedFullName = normalizeString(fullName)

  addField('email', normalizedEmail)
  addField('password', await bcrypt.hash(password, 10))

  const usernameField = chooseColumn(columns, ['username', 'user_name', 'name'])
  const fullNameField = chooseColumn(columns, ['full_name', 'fullName', 'name'])

  if (normalizedUsername && usernameField) {
    addField(usernameField, normalizedUsername)
  }

  if (normalizedFullName && fullNameField && fullNameField !== usernameField) {
    addField(fullNameField, normalizedFullName)
  } else if (normalizedFullName && !normalizedUsername && fullNameField && fullNameField === 'name') {
    addField('name', normalizedFullName)
  }

  const sql = `INSERT INTO users (${fieldNames.join(',')}) VALUES (${placeholders.join(',')})`
  const result = await dbQuery(sql, values)
  return getUserById(result.insertId)
}

async function dbQuery(sql, params = []) {
  const [rows] = await dbPool.execute(sql, params)
  return rows
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase()
}

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null
  const rows = await dbQuery('SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', [normalizedEmail])
  return normalizeUserRow(rows[0])
}

async function getUserByIdentifier(identifier) {
  const normalizedIdentifier = normalizeString(identifier)
  if (!normalizedIdentifier) return null

  const emailUser = await getUserByEmail(normalizedIdentifier)
  if (emailUser) return emailUser

  const columns = await getUserColumns()
  const usernameField = chooseColumn(columns, ['username', 'user_name', 'name'])
  if (!usernameField) return null

  const rows = await dbQuery(`SELECT * FROM users WHERE LOWER(${usernameField}) = LOWER(?) LIMIT 1`, [normalizedIdentifier])
  return normalizeUserRow(rows[0])
}

async function verifyPassword(plain, stored) {
  if (!plain || !stored) return false
  if (/^\$2[aby]\$/.test(stored)) {
    return bcrypt.compare(plain, stored)
  }
  return plain === stored
}

function createSessionToken(user) {
  return jwt.sign({ id: user.id, uid: user.uid, email: user.email, username: user.username }, SESSION_SECRET, {
    expiresIn: '7d'
  })
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET)
  } catch (err) {
    return null
  }
}

const clientOrigin = process.env.CLIENT_ORIGIN || (process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173')
app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use('/api/auth/social', authSocialRouter)

const isProduction = process.env.NODE_ENV === 'production'
const sessionCookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
}

const authenticate = async (req, res, next) => {
  const sessionToken = req.cookies?.session || null
  if (sessionToken) {
    const decoded = verifySessionToken(sessionToken)
    if (decoded) {
      req.user = decoded
      return next()
    }
  }

  if (hasFirebaseAdminConfig) {
    const sessionCookie = req.cookies?.session || null
    if (sessionCookie) {
      try {
        const decoded = await admin.auth().verifySessionCookie(sessionCookie, true)
        req.user = decoded
        return next()
      } catch (err) {
        console.error('Session cookie verification failed:', err)
      }
    }

    const authHeader = req.headers.authorization || ''
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : null
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken)
        req.user = decodedToken
        return next()
      } catch (error) {
        console.error('Firebase token verification failed:', error)
      }
    }
  }

  return res.status(401).json({ error: 'Unauthorized. Please sign in.' })
}

app.get('/auth/me', async (req, res) => {
  const sessionToken = req.cookies?.session || null
  const decoded = sessionToken ? verifySessionToken(sessionToken) : null
  if (!decoded?.id) {
    return res.json({ user: null })
  }
  const user = await getUserById(decoded.id)
  return res.json({ user: user || null })
})

app.get('/api/auth/me', async (req, res) => {
  const sessionToken = req.cookies?.session || null
  const decoded = sessionToken ? verifySessionToken(sessionToken) : null
  if (!decoded?.id) {
    return res.json({ user: null })
  }
  const user = await getUserById(decoded.id)
  return res.json({ user: user || null })
})

app.get('/auth/user/:id', authenticate, async (req, res) => {
  const user = await getUserById(req.params.id)
  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }
  return res.json({ user: {
    id: user.id,
    uid: user.uid,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    createdAt: user.createdAt
  }})
})

app.get('/auth/users', authenticate, async (req, res) => {
  const ids = String(req.query.ids || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (!ids.length) {
    return res.status(400).json({ error: 'No user ids supplied' })
  }

  const placeholders = ids.map(() => '?').join(',')
  const rows = await dbQuery(`SELECT * FROM users WHERE id IN (${placeholders})`, ids)
  const users = rows.map(normalizeUserRow).map((user) => ({
    id: user.id,
    uid: user.uid,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    createdAt: user.createdAt
  }))

  return res.json({ users })
})

app.post('/api/auth/login', async (req, res) => {
  const identifier = normalizeString(req.body.email || req.body.identifier || req.body.username)
  const password = normalizeString(req.body.password)

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' })
  }

  try {
    const user = await getUserByIdentifier(identifier)
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    const mfaSettings = await dbQuery(
      'SELECT mfa_enabled, email_mfa_enabled, sms_mfa_enabled, totp_mfa_enabled FROM mfa_settings WHERE user_id = ?',
      [user.id]
    )

    const hasMFA = mfaSettings.length > 0 && mfaSettings[0].mfa_enabled
    if (hasMFA) {
      return res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        mfaRequired: true,
        mfaMethods: {
          email: mfaSettings[0].email_mfa_enabled,
          sms: mfaSettings[0].sms_mfa_enabled,
          totp: mfaSettings[0].totp_mfa_enabled,
        },
      })
    }

    const token = createSessionToken(user)
    res.cookie('session', token, sessionCookieOptions)
    return res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      mfaRequired: false,
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Unable to login. Please try again later.' })
  }
})

app.post('/login', async (req, res) => {
  const identifier = normalizeString(req.body.email || req.body.identifier || req.body.username)
  const password = normalizeString(req.body.password)

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email/username and password are required.' })
  }

  try {
    const user = await getUserByIdentifier(identifier)
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }

    // Check if MFA is enabled
    const mfaSettings = await dbQuery(
      'SELECT mfa_enabled, email_mfa_enabled, sms_mfa_enabled, totp_mfa_enabled FROM mfa_settings WHERE user_id = ?',
      [user.id]
    )

    const hasMFA = mfaSettings.length > 0 && mfaSettings[0].mfa_enabled

    if (hasMFA) {
      // Return user data with MFA required flag
      return res.json({
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          createdAt: user.createdAt
        },
        mfaRequired: true,
        mfaMethods: {
          email: mfaSettings[0].email_mfa_enabled,
          sms: mfaSettings[0].sms_mfa_enabled,
          totp: mfaSettings[0].totp_mfa_enabled
        }
      })
    }

    // Standard login without MFA
    const token = createSessionToken(user)
    res.cookie('session', token, sessionCookieOptions)
    return res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        createdAt: user.createdAt
      },
      mfaRequired: false
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Unable to login. Please try again later.' })
  }
})

app.post('/login/social', async (req, res) => {
  const provider = normalizeString(req.body.provider)
  const idToken = normalizeString(req.body.idToken)

  if (!provider || !idToken) {
    return res.status(400).json({ error: 'Social provider and token are required.' })
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken)
    const email = normalizeEmail(decodedToken.email)
    if (!email || !decodedToken.email_verified) {
      return res.status(401).json({ error: 'Unable to verify social login email.' })
    }

    let user = await getUserByEmail(email)
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex')
      user = await createUser({
        fullName: decodedToken.name || '',
        username: decodedToken.name || email.split('@')[0],
        email,
        password: randomPassword
      })
    }

    const mfaSettings = await dbQuery(
      'SELECT mfa_enabled, email_mfa_enabled, sms_mfa_enabled, totp_mfa_enabled FROM mfa_settings WHERE user_id = ?',
      [user.id]
    )

    const hasMFA = mfaSettings.length > 0 && mfaSettings[0].mfa_enabled
    const userPayload = {
      id: user.id,
      uid: user.uid,
      email: user.email,
      username: user.username,
      fullName: user.fullName,
      createdAt: user.createdAt
    }

    if (hasMFA) {
      return res.json({
        user: userPayload,
        mfaRequired: true,
        mfaMethods: {
          email: mfaSettings[0].email_mfa_enabled,
          sms: mfaSettings[0].sms_mfa_enabled,
          totp: mfaSettings[0].totp_mfa_enabled
        }
      })
    }

    const token = createSessionToken(user)
    res.cookie('session', token, sessionCookieOptions)
    return res.json({ user: userPayload, mfaRequired: false })
  } catch (err) {
    console.error('Social login error:', err)
    return res.status(401).json({ error: 'Social login failed. Please try again.' })
  }
})


app.post('/register', async (req, res) => {
  const fullName = normalizeString(req.body.fullName)
  const username = normalizeString(req.body.username)
  const email = normalizeEmail(req.body.email)
  const password = normalizeString(req.body.password)

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }

  try {
    const existing = await getUserByIdentifier(email)
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }

    const newUser = await createUser({ fullName, username, email, password })
    return res.status(201).json({ user: { id: newUser.id, uid: newUser.uid, email: newUser.email, username: newUser.username, fullName: newUser.fullName, createdAt: newUser.createdAt } })
  } catch (err) {
    console.error('Register error:', err)
    return res.status(500).json({ error: 'Unable to register. Please try again later.' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('session', { path: '/' })
  return res.json({ status: 'success' })
})

app.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' })
  return res.json({ status: 'success' })
})

app.use('/api/sync', authenticate, syncRouter)

app.post('/api/generate-quiz', authenticate, async (req, res) => {
  const { fileContent, quizType, count } = req.body

  if (!fileContent) {
    return res.status(400).json({ error: 'File content is required' })
  }

  if (!process.env.VITE_GROQ_API_KEY) {
    return res.status(500).json({ error: 'Groq API token not configured' })
  }

  const apiKey = process.env.VITE_GROQ_API_KEY
  const limitedText = fileContent.slice(0, 20000)

  function buildPrompt(quizType, count) {
    const typeInstructions = {
      multiple_choice: `Generate ${count} multiple-choice questions with 4 options (A, B, C, D). Return only a JSON array with this schema:\n[{"type":"multiple_choice","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"..."}]`,
      true_false: `Generate ${count} true/false questions. Return only a JSON array with this schema:\n[{"type":"true_false","question":"...","answer":"True","explanation":"..."}]`,
      identification: `Generate ${count} identification/short-answer questions. Return only a JSON array with this schema:\n[{"type":"identification","question":"...","answer":"exact answer","explanation":"..."}]`,
      mixed: `Generate ${count} questions mixing types: ~40% multiple-choice (4 options), ~30% true/false, ~30% short-answer. Return only a JSON array.`
    }

    return `Based on this content, ${typeInstructions[quizType]}\n\nContent:\n${limitedText}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`
  }

  try {
    const prompt = buildPrompt(quizType, count)

    console.log('Starting quiz generation with Groq API...', { quizType, count, textLength: limitedText.length })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Groq API error:', response.status, errorText)
      return res.status(response.status).json({
        error: `Groq API error: ${response.status}. Check your API key and rate limits.`
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return res.status(500).json({ error: 'No response content from Groq API' })
    }

    let questions = []
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        questions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error('Failed to parse response JSON:', content, parseError)
      return res.status(500).json({
        error: 'Failed to parse questions from Groq response. Please try again.'
      })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({
        error: 'No valid questions generated. Please try again.'
      })
    }

    console.log(`✓ Generated ${questions.length} questions`)
    return res.json({ questions })
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: error?.message || 'Internal server error' })
  }
})

// ========================================
// MFA (Multi-Factor Authentication) Routes
// ========================================

/**
 * POST /mfa/setup
 * Initialize MFA setup for user
 * Returns TOTP secret and QR code
 */
app.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { mfaMethod } = req.body

    if (!['email', 'sms', 'totp'].includes(mfaMethod)) {
      return res.status(400).json({ error: 'Invalid MFA method' })
    }

    const user = await getUserById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    let setupData = { method: mfaMethod }

    if (mfaMethod === 'totp') {
      // Generate TOTP secret
      const secret = mfaService.generateTOTPSecret(user.email)
      const qrCode = await mfaService.generateQRCode(secret)

      setupData = {
        method: 'totp',
        secret: secret.base32,
        qrCode: qrCode,
        backupCodes: mfaService.generateBackupCodes()
      }
    } else if (mfaMethod === 'email') {
      // Send verification OTP to email
      const otp = mfaService.generateOTPCode()
      await mfaService.sendEmailOTP(user.id, user.email, otp, dbQuery)

      setupData = {
        method: 'email',
        message: 'OTP sent to your email'
      }
    } else if (mfaMethod === 'sms') {
      // Check if phone number is provided
      const { phoneNumber } = req.body
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number required for SMS MFA' })
      }

      // Send verification OTP to phone
      const otp = mfaService.generateOTPCode()
      await mfaService.sendSMSOTP(phoneNumber, otp, dbQuery, userId)

      setupData = {
        method: 'sms',
        message: 'OTP sent to your phone',
        phoneNumber: phoneNumber.slice(0, -4) + '****'
      }
    }

    return res.json({ success: true, setup: setupData })
  } catch (err) {
    console.error('MFA setup error:', err)
    return res.status(500).json({ error: err.message || 'Failed to setup MFA' })
  }
})

/**
 * POST /mfa/verify-setup
 * Verify and enable MFA method
 */
app.post('/mfa/verify-setup', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { mfaMethod, code, secret, backupCodes, phoneNumber } = req.body

    if (!['email', 'sms', 'totp'].includes(mfaMethod)) {
      return res.status(400).json({ error: 'Invalid MFA method' })
    }

    let isValid = false

    if (mfaMethod === 'totp') {
      // Verify TOTP token
      if (!code || !secret) {
        return res.status(400).json({ error: 'Code and secret are required' })
      }
      isValid = mfaService.verifyTOTPToken(secret, code)

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid TOTP code' })
      }

      // Save TOTP secret and backup codes
      await mfaService.updateMFASettings(
        userId,
        {
          totp_mfa_enabled: true,
          totp_secret: secret,
          backup_codes: JSON.stringify(backupCodes),
          mfa_enabled: true
        },
        dbQuery
      )
    } else if (mfaMethod === 'email') {
      // Verify email OTP
      const result = await mfaService.verifyOTPCode(userId, code, dbQuery)

      if (!result.success) {
        return res.status(400).json({ error: result.message })
      }

      // Enable email MFA
      await mfaService.updateMFASettings(
        userId,
        {
          email_mfa_enabled: true,
          mfa_enabled: true
        },
        dbQuery
      )
    } else if (mfaMethod === 'sms') {
      // Verify SMS OTP
      const result = await mfaService.verifyOTPCode(userId, code, dbQuery)

      if (!result.success) {
        return res.status(400).json({ error: result.message })
      }

      // Enable SMS MFA
      await mfaService.updateMFASettings(
        userId,
        {
          sms_mfa_enabled: true,
          phone_number: phoneNumber,
          mfa_enabled: true
        },
        dbQuery
      )
    }

    return res.json({
      success: true,
      message: `${mfaMethod.toUpperCase()} MFA enabled successfully`
    })
  } catch (err) {
    console.error('MFA verification error:', err)
    return res.status(500).json({ error: err.message || 'Failed to verify MFA' })
  }
})

/**
 * POST /mfa/verify-login
 * Verify MFA code during login
 * Should be called after successful password authentication
 */
app.post('/mfa/verify-login', async (req, res) => {
  try {
    const { userId, code, method } = req.body

    if (!userId || !code || !method) {
      return res.status(400).json({ error: 'userId, code, and method are required' })
    }

    if (!['email', 'sms', 'totp', 'backup'].includes(method)) {
      return res.status(400).json({ error: 'Invalid verification method' })
    }

    let isValid = false

    if (method === 'totp') {
      // Get TOTP secret from database
      const mfaSettings = await dbQuery(
        'SELECT totp_secret FROM mfa_settings WHERE user_id = ? AND totp_mfa_enabled = 1',
        [userId]
      )

      if (mfaSettings.length === 0) {
        return res.status(400).json({ error: 'TOTP not enabled for this user' })
      }

      isValid = mfaService.verifyTOTPToken(mfaSettings[0].totp_secret, code)
    } else if (method === 'email' || method === 'sms') {
      const mfaSettings = await dbQuery(
        'SELECT email_mfa_enabled, sms_mfa_enabled FROM mfa_settings WHERE user_id = ?',
        [userId]
      )

      if (mfaSettings.length === 0) {
        return res.status(400).json({ error: 'MFA is not configured for this user' })
      }

      const enabledEmail = mfaSettings[0].email_mfa_enabled
      const enabledSMS = mfaSettings[0].sms_mfa_enabled

      if ((method === 'email' && !enabledEmail) || (method === 'sms' && !enabledSMS)) {
        return res.status(400).json({ error: `${method.toUpperCase()} MFA is not enabled for this user` })
      }

      const result = await mfaService.verifyOTPCode(userId, code, dbQuery)
      isValid = result.success
    } else if (method === 'backup') {
      // Verify backup code
      const result = await mfaService.verifyBackupCode(userId, code, dbQuery)
      isValid = result.success
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Generate session token
    const user = await getUserById(userId)
    const token = createSessionToken(user)
    res.cookie('session', token, sessionCookieOptions)

    return res.json({
      success: true,
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('MFA login verification error:', err)
    return res.status(500).json({ error: err.message || 'Failed to verify MFA' })
  }
})

/**
 * GET /mfa/settings
 * Get MFA settings for authenticated user
 */
app.get('/mfa/settings', authenticate, async (req, res) => {
  try {
    const userId = req.user?.id
    console.log('[MFA Settings] User:', userId, 'req.user:', req.user)
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated or user ID missing' })
    }
    
    const settings = await mfaService.getMFASettings(userId, dbQuery)
    console.log('[MFA Settings] Retrieved settings for user', userId)

    return res.json({ success: true, settings })
  } catch (err) {
    console.error('[MFA Settings] Error:', err.message || err)
    console.error('[MFA Settings] Error stack:', err.stack)
    return res.status(500).json({ error: err.message || 'Failed to get MFA settings' })
  }
})

/**
 * POST /mfa/disable/:method
 * Disable a specific MFA method
 */
app.post('/mfa/disable/:method', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { method } = req.params

    const allowedMethods = {
      'email': 'email_mfa_enabled',
      'sms': 'sms_mfa_enabled',
      'totp': 'totp_mfa_enabled'
    }

    if (!allowedMethods[method]) {
      return res.status(400).json({ error: 'Invalid MFA method' })
    }

    const updates = {
      [allowedMethods[method]]: false
    }

    // If disabling TOTP, also clear the secret
    if (method === 'totp') {
      updates.totp_secret = null
      updates.backup_codes = null
    }

    // If disabling SMS, also clear phone number
    if (method === 'sms') {
      updates.phone_number = null
    }

    await mfaService.updateMFASettings(userId, updates, dbQuery)

    // Check if any MFA is still enabled
    const settings = await mfaService.getMFASettings(userId, dbQuery)
    const anyMFAEnabled = settings.email_mfa_enabled || settings.sms_mfa_enabled || settings.totp_mfa_enabled

    if (!anyMFAEnabled) {
      await mfaService.updateMFASettings(userId, { mfa_enabled: false }, dbQuery)
    }

    return res.json({
      success: true,
      message: `${method.toUpperCase()} MFA disabled successfully`
    })
  } catch (err) {
    console.error('Disable MFA error:', err)
    return res.status(500).json({ error: err.message || 'Failed to disable MFA' })
  }
})

/**
 * POST /mfa/send-otp
 * Request OTP to be sent during MFA verification
 */
app.post('/mfa/send-otp', async (req, res) => {
  try {
    const { userId, method } = req.body

    if (!userId || !method) {
      return res.status(400).json({ error: 'userId and method are required' })
    }

    if (!['email', 'sms'].includes(method)) {
      return res.status(400).json({ error: 'Invalid method. Only email and sms are supported' })
    }

    const user = await getUserById(userId)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const mfaSettings = await dbQuery(
      'SELECT email_mfa_enabled, sms_mfa_enabled, phone_number FROM mfa_settings WHERE user_id = ?',
      [userId]
    )

    if (mfaSettings.length === 0) {
      return res.status(400).json({ error: 'MFA is not configured for this user' })
    }

    const enabledEmail = mfaSettings[0].email_mfa_enabled
    const enabledSMS = mfaSettings[0].sms_mfa_enabled
    const phoneNumber = mfaSettings[0].phone_number

    const otp = mfaService.generateOTPCode()

    if (method === 'email') {
      if (!enabledEmail) {
        return res.status(400).json({ error: 'Email MFA is not enabled for this user' })
      }
      await mfaService.sendEmailOTP(user.id, user.email, otp, dbQuery)
    } else if (method === 'sms') {
      if (!enabledSMS || !phoneNumber) {
        return res.status(400).json({ error: 'SMS MFA is not enabled or no phone number is configured' })
      }
      await mfaService.sendSMSOTP(phoneNumber, otp, dbQuery, userId)
    }

    return res.json({
      success: true,
      message: `OTP sent to ${method}`
    })
  } catch (err) {
    console.error('Send OTP error:', err)
    return res.status(500).json({ error: err.message || 'Failed to send OTP' })
  }
})

export default app
