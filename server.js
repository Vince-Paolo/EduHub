import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import admin from "firebase-admin"
import cookieParser from "cookie-parser"
import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import syncRouter from "./api/sync.js"

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envCandidates = [
  path.resolve(__dirname, ".env.local"),
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env.local"),
  path.resolve(__dirname, "..", ".env")
]

const envPath = envCandidates.find(fs.existsSync)
if (envPath) {
  dotenv.config({ path: envPath })
  console.log(`Loaded environment from ${envPath}`)
  console.log(`Token value: ${process.env.VITE_GROQ_API_KEY ? "SET" : "NOT SET"}`)
} else {
  console.warn("No .env file found in current or parent directory.")
}

const hasFirebaseAdminConfig = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY
)

if (!hasFirebaseAdminConfig) {
  console.warn("Firebase Admin config is not fully provided. Backend auth verification will fail until FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are configured.")
}

const DB_HOST = process.env.DB_HOST || "127.0.0.1"
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || "root"
const DB_PASSWORD = process.env.DB_PASSWORD || ""
const DB_NAME = process.env.DB_NAME || "eduhubdb"
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret"

const dbPool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4"
})

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
  const rows = await dbQuery("SELECT * FROM users WHERE id = ? LIMIT 1", [id])
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
    // Prefer explicit username column, otherwise fall back to the shared name field.
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
  const rows = await dbQuery("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [normalizedEmail])
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

if (hasFirebaseAdminConfig) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    })
  })
}

const PORT = process.env.PORT || 5000

// Middleware
// Allow cross-origin requests from the frontend and allow cookies
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173"
app.use(cors({ origin: clientOrigin, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const isProduction = process.env.NODE_ENV === "production"
const sessionCookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/"
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
        console.error("Session cookie verification failed:", err)
      }
    }

    const authHeader = req.headers.authorization || ""
    const idToken = authHeader.startsWith("Bearer ") ? authHeader.split("Bearer ")[1] : null
    if (idToken) {
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken)
        req.user = decodedToken
        return next()
      } catch (error) {
        console.error("Firebase token verification failed:", error)
      }
    }
  }

  return res.status(401).json({ error: "Unauthorized. Please sign in." })
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

    const token = createSessionToken(user)
    res.cookie('session', token, sessionCookieOptions)
    return res.json({ user: { id: user.id, uid: user.uid, email: user.email, username: user.username, fullName: user.fullName, createdAt: user.createdAt } })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Unable to login. Please try again later.' })
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

app.post('/logout', (req, res) => {
  res.clearCookie('session', { path: '/' })
  return res.json({ status: 'success' })
})

// Sync endpoint — handles offline progress queue flush
app.use("/api/sync", authenticate, syncRouter)

// Quiz generation endpoint using Groq API
app.post("/api/generate-quiz", authenticate, async (req, res) => {
  const { fileContent, quizType, count } = req.body

  if (!fileContent) {
    return res.status(400).json({ error: "File content is required" })
  }

  if (!process.env.VITE_GROQ_API_KEY) {
    return res.status(500).json({ error: "Groq API token not configured" })
  }

  const apiKey = process.env.VITE_GROQ_API_KEY
  const limitedText = fileContent.slice(0, 20000)

  function buildPrompt(quizType, count) {
    const typeInstructions = {
      multiple_choice: `Generate ${count} multiple-choice questions with 4 options (A, B, C, D). Return only a JSON array with this schema:
[{"type":"multiple_choice","question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"..."}]`,
      true_false: `Generate ${count} true/false questions. Return only a JSON array with this schema:
[{"type":"true_false","question":"...","answer":"True","explanation":"..."}]`,
      identification: `Generate ${count} identification/short-answer questions. Return only a JSON array with this schema:
[{"type":"identification","question":"...","answer":"exact answer","explanation":"..."}]`,
      mixed: `Generate ${count} questions mixing types: ~40% multiple-choice (4 options), ~30% true/false, ~30% short-answer. Return only a JSON array.`
    }
    
    return `Based on this content, ${typeInstructions[quizType]}\n\nContent:\n${limitedText}\n\nIMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanation.`
  }

  try {
    const prompt = buildPrompt(quizType, count)
    
    console.log("Starting quiz generation with Groq API...", { quizType, count, textLength: limitedText.length })

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_completion_tokens: 2000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Groq API error:", response.status, errorText)
      return res.status(response.status).json({ 
        error: `Groq API error: ${response.status}. Check your API key and rate limits.` 
      })
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return res.status(500).json({ error: "No response content from Groq API" })
    }

    // Parse JSON from response
    let questions = []
    try {
      // Try to extract JSON array from response
      const jsonMatch = content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0])
      } else {
        questions = JSON.parse(content)
      }
    } catch (parseError) {
      console.error("Failed to parse response JSON:", content, parseError)
      return res.status(500).json({ 
        error: "Failed to parse questions from Groq response. Please try again." 
      })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(500).json({ 
        error: "No valid questions generated. Please try again." 
      })
    }

    console.log(`✓ Generated ${questions.length} questions`)
    return res.json({ questions })

  } catch (error) {
    console.error("Server error:", error)
    return res.status(500).json({ error: error?.message || "Internal server error" })
  }
})

app.listen(PORT, () => {
  console.log(`\n✓ Server listening on port ${PORT}`)
  console.log(`✓ Groq API quiz generation enabled`)
  console.log(`✓ POST /api/generate-quiz ready for requests`)
  console.log(`✓ POST /api/sync  — offline sync queue endpoint ready`)
  console.log(`✓ GET  /api/sync/:userId — progress fetch ready\n`)
})