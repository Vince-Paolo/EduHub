import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import path from 'path'
const envPath = path.resolve(process.cwd(), '.env.local')
dotenv.config({ path: envPath })
const DB_HOST = process.env.DB_HOST || '127.0.0.1'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'eduhubdb'
const pool = mysql.createPool({ host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, waitForConnections: true, connectionLimit: 2, queueLimit: 0 })
function normalizeUserRow(row) {
  if (!row) return null
  const id = row.id ?? row.user_id ?? row.uid ?? row.ID
  const email = row.email ?? row.email_address ?? row.user_email
  const username = row.username ?? row.user_name ?? row.name
  const fullName = row.full_name ?? row.fullName ?? row.name
  return {
    id,
    uid: id,
    email,
    username,
    fullName,
    password: row.password ?? row.pass ?? row.password_hash ?? row.pwd
  }
}
async function dbQuery(sql, params = []) {
  const [rows] = await pool.execute(sql, params)
  return rows
}
async function getUserByEmail(email) {
  const rows = await dbQuery('SELECT * FROM users WHERE email = ? LIMIT 1', [email])
  return normalizeUserRow(rows[0])
}
async function getUserByIdentifier(identifier) {
  let user = await getUserByEmail(identifier)
  if (user) return user
  const rows = await dbQuery('SELECT * FROM users WHERE username = ? LIMIT 1', [identifier])
  return normalizeUserRow(rows[0])
}
async function verifyPassword(plain, stored) {
  console.log('verifyPassword', { plain, stored })
  if (!plain || !stored) return false
  if (/^\$2[aby]\$/.test(stored)) {
    const bcrypt = await import('bcryptjs')
    return bcrypt.compare(plain, stored)
  }
  return plain === stored
}
try {
  const user = await getUserByIdentifier('test@example.com')
  console.log('user', user)
  if (!user) {
    console.log('no user found')
  } else {
    const valid = await verifyPassword('testpass123', user.password)
    console.log('password valid', valid)
  }
} catch (err) {
  console.error('debug-error', err.stack || err.message)
} finally {
  await pool.end()
}
