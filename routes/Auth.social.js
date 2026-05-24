// routes/Auth.social.js
// Verifies Google / Facebook tokens server-side, then issues a session cookie.

import express from "express"
import { OAuth2Client } from "google-auth-library"
import axios from "axios"
import mysql from "mysql2/promise"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const router = express.Router()

const DB_HOST = process.env.DB_HOST || "127.0.0.1"
const DB_PORT = Number(process.env.DB_PORT || 3306)
const DB_USER = process.env.DB_USER || "root"
const DB_PASSWORD = process.env.DB_PASSWORD || ""
const DB_NAME = process.env.DB_NAME || "eduhubdb"
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret"

const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
})

const isProduction = process.env.NODE_ENV === "production"
const sessionCookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000,
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
}

const googleClient = new OAuth2Client(
  process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
)

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeEmail(value) {
  return normalizeString(value).toLowerCase()
}

function chooseColumn(columns, candidates) {
  return candidates.find((column) => columns.includes(column))
}

async function dbQuery(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

async function getUserColumns() {
  const rows = await dbQuery(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'`,
    [DB_NAME]
  )
  return rows.map((row) => row.COLUMN_NAME)
}

function normalizeUserRow(row) {
  if (!row) return null
  const id = row.id ?? row.user_id ?? row.uid ?? row.ID
  const email = row.email ?? row.email_address ?? row.user_email
  const username = row.username ?? row.user_name ?? row.name
  const fullName = row.full_name ?? row.fullName ?? row.name
  const createdAtRaw = row.created_at ?? row.createdAt ?? row.joinDate
  const createdAt = createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw
  return {
    ...row,
    id,
    uid: id,
    email,
    username,
    fullName,
    createdAt,
  }
}

async function getUserByEmail(email) {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  const rows = await dbQuery("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1", [normalized])
  return normalizeUserRow(rows[0])
}

async function createUser({ email, fullName, username, password, provider, avatarUrl }) {
  const columns = await getUserColumns()
  const fieldNames = []
  const values = []
  const placeholders = []

  const addField = (field, value) => {
    if (!field || value === undefined || value === null) return
    fieldNames.push(field)
    values.push(value)
    placeholders.push("?")
  }

  addField("email", normalizeEmail(email))
  addField("password", await bcrypt.hash(password, 10))

  const usernameField = chooseColumn(columns, ["username", "user_name", "name"])
  const fullNameField = chooseColumn(columns, ["full_name", "fullName", "name"])

  if (username && usernameField) addField(usernameField, normalizeString(username))
  if (fullName && fullNameField && fullNameField !== usernameField) addField(fullNameField, normalizeString(fullName))
  if (avatarUrl && columns.includes("avatarUrl")) addField("avatarUrl", avatarUrl)
  if (provider && columns.includes("provider")) addField("provider", provider)

  const sql = `INSERT INTO users (${fieldNames.join(",")}) VALUES (${placeholders.join(",")})`
  const [result] = await pool.execute(sql, values)
  const insertedId = result.insertId
  const rows = await dbQuery("SELECT * FROM users WHERE id = ? LIMIT 1", [insertedId])
  return normalizeUserRow(rows[0])
}

async function updateUserProfile(userId, updates) {
  const columns = await getUserColumns()
  const assignments = []
  const values = []

  for (const [key, value] of Object.entries(updates)) {
    if (!columns.includes(key) || value === undefined || value === null) continue
    assignments.push(`${key} = ?`)
    values.push(value)
  }

  if (!assignments.length) return
  values.push(userId)
  await dbQuery(`UPDATE users SET ${assignments.join(", ")} WHERE id = ?`, values)
}

function createSessionToken(user) {
  return jwt.sign({ id: user.id, uid: user.uid, email: user.email, username: user.username }, SESSION_SECRET, {
    expiresIn: "7d",
  })
}

function issueSessionCookie(res, user) {
  const token = createSessionToken(user)
  res.cookie("session", token, sessionCookieOptions)
}

async function getMfaMethods(userId) {
  const rows = await dbQuery(
    "SELECT email_mfa_enabled, sms_mfa_enabled, totp_mfa_enabled FROM mfa_settings WHERE user_id = ?",
    [userId]
  )
  return rows[0] || {}
}

router.post("/google", async (req, res) => {
  const { code } = req.body
  if (!code) return res.status(400).json({ message: "Missing authorization code" })

  try {
    const { tokens } = await googleClient.getToken(code)
    googleClient.setCredentials(tokens)

    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email || !payload.email_verified) {
      return res.status(401).json({ message: "Google email is not verified." })
    }

    const email = payload.email
    const name = payload.name || ""
    const picture = payload.picture || null

    let user = await getUserByEmail(email)
    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex")
      user = await createUser({
        email,
        fullName: name,
        username: name || email.split("@")[0],
        password: randomPassword,
        provider: "google",
        avatarUrl: picture,
      })
    } else {
      await updateUserProfile(user.id, { avatarUrl: picture })
    }

    const mfaSettings = await getMfaMethods(user.id)
    const hasMFA = Boolean(mfaSettings.email_mfa_enabled || mfaSettings.sms_mfa_enabled || mfaSettings.totp_mfa_enabled)
    if (hasMFA) {
      return res.json({
        mfaRequired: true,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        mfaMethods: {
          email: Boolean(mfaSettings.email_mfa_enabled),
          sms: Boolean(mfaSettings.sms_mfa_enabled),
          totp: Boolean(mfaSettings.totp_mfa_enabled),
        },
      })
    }

    issueSessionCookie(res, user)
    return res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("[Google OAuth]", err)
    return res.status(401).json({ message: "Google verification failed." })
  }
})

router.post("/facebook", async (req, res) => {
  const { accessToken, userID } = req.body
  if (!accessToken || !userID) {
    return res.status(400).json({ message: "Missing Facebook credentials" })
  }

  try {
    const debugUrl = "https://graph.facebook.com/debug_token"
    const debugRes = await axios.get(debugUrl, {
      params: {
        input_token: accessToken,
        access_token: `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`,
      },
    })

    const debug = debugRes.data
    const { is_valid, app_id, user_id } = debug.data || {}
    if (!is_valid || app_id !== process.env.FACEBOOK_APP_ID || user_id !== userID) {
      return res.status(401).json({ message: "Invalid Facebook token." })
    }

    const profileRes = await axios.get("https://graph.facebook.com/me", {
      params: {
        fields: "id,name,email,picture.type(large)",
        access_token: accessToken,
      },
    })

    const profile = profileRes.data
    if (!profile.email) {
      return res.status(422).json({ message: "Your Facebook account doesn't share an email. Please sign in with email." })
    }

    const email = profile.email
    const name = profile.name || ""
    const avatarUrl = profile.picture?.data?.url || null

    let user = await getUserByEmail(email)
    if (!user) {
      const randomPassword = crypto.randomBytes(24).toString("hex")
      user = await createUser({
        email,
        fullName: name,
        username: name || email.split("@")[0],
        password: randomPassword,
        provider: "facebook",
        avatarUrl,
      })
    } else {
      await updateUserProfile(user.id, { avatarUrl })
    }

    const mfaSettings = await getMfaMethods(user.id)
    const hasMFA = Boolean(mfaSettings.email_mfa_enabled || mfaSettings.sms_mfa_enabled || mfaSettings.totp_mfa_enabled)
    if (hasMFA) {
      return res.json({
        mfaRequired: true,
        user: {
          id: user.id,
          uid: user.uid,
          email: user.email,
          username: user.username,
          fullName: user.fullName,
          createdAt: user.createdAt,
        },
        mfaMethods: {
          email: Boolean(mfaSettings.email_mfa_enabled),
          sms: Boolean(mfaSettings.sms_mfa_enabled),
          totp: Boolean(mfaSettings.totp_mfa_enabled),
        },
      })
    }

    issueSessionCookie(res, user)
    return res.json({
      user: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
    })
  } catch (err) {
    console.error("[Facebook OAuth]", err)
    return res.status(401).json({ message: "Facebook verification failed." })
  }
})

export default router
